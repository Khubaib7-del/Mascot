import {
  CanvasTexture, DirectionalLight, FogExp2, HemisphereLight, IUniform, Mesh, MeshBasicMaterial, NeutralToneMapping, PCFShadowMap,
  PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShaderMaterial, ShadowMaterial, SRGBColorSpace, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { CameraPresetId, ClipId, LightingId, MascotConfig, MascotDefinition, WorldId } from '../mascot/types';
import { DEFAULT_PARAMS } from '../mascot/types';
import { defaultConfig } from '../mascot/config';
import { MascotInstance } from './mascotInstance';
import { CameraRig, type RigOptions } from './camera';
import { buildEnvironmentTexture, LIGHTING, type LightingDef } from './lighting';
import { WORLDS, type WorldRuntime } from './worlds';
import { resetCloudCache } from './worlds/common';
import { detectTier, lowerTier, TIERS, type QualityTier } from './quality';
import { MOVEMENTS, type MovementDef } from './animation/movement';

export interface StageOptions {
  quality?: QualityTier;
  /** hero = gentle handling that springs back; playground = full inspection; static = no input. */
  mode: 'hero' | 'playground' | 'static';
  /** Horizontal framing shift as a fraction of canvas width (positive moves the mascot right). */
  shiftX?: number;
  adaptive?: boolean;
  onEvent?: (e: StageEvent) => void;
}

export type StageEvent =
  | { type: 'frame' }
  | { type: 'tier'; tier: QualityTier; reason: 'user' | 'adaptive' | 'fallback' }
  | { type: 'clip'; clip: ClipId | null }
  | { type: 'fallback'; message: string }
  | { type: 'context'; lost: boolean };

export interface TravelOptions {
  config?: MascotConfig;
  def?: MascotDefinition;
  entrance?: string | MovementDef;
  exit?: string;
}

/**
 * One renderer, one scene. The renderer is never recreated for quality, world or mascot changes:
 * every change is staged (build → validate → commit) and rolls back to the last working scene on failure,
 * so the character can never disappear because of a settings change.
 */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 1, 0.1, 200);
  private rig: CameraRig;
  private instances = new Map<string, MascotInstance>();
  private instance: MascotInstance | null = null;
  private config: MascotConfig | null = null;
  private key = new DirectionalLight();
  private rim = new DirectionalLight();
  private fill = new HemisphereLight();
  private ground: Mesh;
  private blob: Mesh;
  private blobTex: Texture;
  private veil: Mesh;
  private veilU = { uAlpha: { value: 0 }, uColor: { value: new Vector3(0.9, 0.93, 0.98) }, uTime: { value: 0 } };
  private time: IUniform<number> = { value: 0 };
  private envCache = new Map<LightingId, { texture: Texture; dispose: () => void }>();
  private light: LightingDef = LIGHTING.studio;
  private envFade = 1;
  private lightK = 1;
  private envK = 1;
  private pendingLight: LightingId | null = null;
  private world: WorldRuntime | null = null;
  private worldId: WorldId | null = null;
  private tier: QualityTier;
  private raf = 0;
  private running = false;
  private disposed = false;
  private visible = true;
  private lost = false;
  private last = 0;
  private elapsed = 0;
  private slowFrames = 0;
  private frameCount = 0;
  private pointer = new Vector2(10, 10);
  private pointerSeen = -99;
  private pointerDirty = false;
  private hover = false;
  private downAt: { x: number; y: number; t: number; pan: boolean } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private ray = new Raycaster();
  private reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObs: ResizeObserver;
  private io: IntersectionObserver;
  private tmp = new Vector3();
  private frozen: number | null = null;
  private loadT = 0;
  private errors = 0;
  /** After a context loss, pre-loss GPU handles are stale: disposing them logs GL errors, and forceContextLoss() frees everything anyway. */
  private hadLoss = false;
  private staleWorlds = new WeakSet<WorldRuntime>();
  private transition: { phase: 'in' | 'swap' | 'out'; t: number; opts: TravelOptions; dur: number } | null = null;
  private pendingEntrance: MovementDef | null = null;

  constructor(readonly canvas: HTMLCanvasElement, private opts: StageOptions) {
    this.tier = opts.quality ?? detectTier();
    this.renderer = this.createRenderer();
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Khronos PBR Neutral keeps brand colours intact where ACES would desaturate them.
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.debug.onShaderError = () => this.onFailure('A shader failed to compile');
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    const rigOpts: RigOptions =
      opts.mode === 'playground'
        ? { zoom: true, orbit: true, pan: true, returnToPreset: false, parallax: 0.3 }
        : opts.mode === 'hero'
          ? { zoom: false, orbit: true, pan: false, returnToPreset: true, parallax: 1 }
          : { zoom: false, orbit: false, pan: false, returnToPreset: false, parallax: 0 };
    this.rig = new CameraRig(rigOpts);

    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -3.2; sc.right = 3.2; sc.top = 3; sc.bottom = -2; sc.near = 0.5; sc.far = 14;
    this.scene.add(this.key, this.key.target, this.rim, this.fill);

    this.ground = new Mesh(new PlaneGeometry(20, 20), createFadingShadowMaterial());
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.blobTex = makeBlobTexture();
    this.blob = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.blobTex, transparent: true, depthWrite: false, toneMapped: false, color: 0x000000 }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.035;
    this.blob.renderOrder = -1;
    this.scene.add(this.blob);

    this.veil = createVeil(this.veilU);
    this.camera.add(this.veil);
    this.scene.add(this.camera);

    this.applyQualityToRenderer();
    this.activateLighting('studio');

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.io = new IntersectionObserver(([e]) => { this.visible = !!e?.isIntersecting; this.syncRunning(); });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (opts.mode !== 'static') this.bindInput();
    this.resize();
  }

  /** MSAA is fixed at creation; if the preferred context fails we retry without it instead of giving up. */
  private createRenderer(): WebGLRenderer {
    const q = TIERS[this.tier];
    for (const aa of q.msaa ? [true, false] : [false]) {
      try { return new WebGLRenderer({ canvas: this.canvas, antialias: aa, alpha: true, powerPreference: 'high-performance', stencil: false }); } catch { /* try next */ }
    }
    throw new Error('WebGL could not be initialised');
  }

  // ------------------------------------------------------------------ public API

  async setMascot(def: MascotDefinition, config?: MascotConfig, o: { entrance?: string | MovementDef; instant?: boolean } = {}) {
    if (def.source.type !== 'procedural') throw new Error('GLB mascots are not wired up in this prototype (see ARCHITECTURE.md, asset pipeline).');
    const cfg = config ?? defaultConfig(def);
    // Stage 1: build the new character first. If this throws, the previous scene is untouched.
    let inst = this.instances.get(def.id);
    if (!inst) { inst = new MascotInstance(def, TIERS[this.tier], this.time); this.instances.set(def.id, inst); }
    if (this.instance && this.instance !== inst) { this.scene.remove(this.instance.root); this.instance.animator.stopMovement(); }
    this.instance = inst;
    this.scene.add(inst.root);
    inst.setFurRamp(o.instant ? 1 : 0);
    this.rig.setFraming(def);
    this.config = cfg;
    this.activateLighting(cfg.lighting, true);
    inst.applyConfig(cfg);
    inst.setFurRim(this.light);
    this.rig.setPreset(cfg.camera, true);
    // Stage 2: environment (a failure keeps whatever world was showing, or the plain studio floor).
    this.swapWorld(cfg.world);
    this.loadT = o.instant ? 99 : 0;
    this.veilU.uAlpha.value = o.instant ? 0 : 1;
    if (o.entrance && !o.instant) this.playMovement(o.entrance);
    this.syncRunning();
  }

  applyConfig(config: MascotConfig) {
    const prev = this.config;
    this.config = config;
    this.guard(() => this.instance?.applyConfig(config), 'config');
    if (!prev || prev.lighting !== config.lighting) this.setLighting(config.lighting);
    if (!prev || prev.world !== config.world) this.travel({ config });
    if (!prev || prev.camera !== config.camera) this.rig.setPreset(config.camera);
  }

  setCameraPreset(id: CameraPresetId) { this.rig.setPreset(id); }
  play(id: ClipId) { this.instance?.animator.play(id); this.opts.onEvent?.({ type: 'clip', clip: id }); }
  stopClip() { this.instance?.animator.stop(); }
  get playing() { return this.instance?.animator.playing ?? null; }
  get qualityTier() { return this.tier; }
  /** Test/QA hook: finish any transition, entrance and progressive load immediately. */
  settle() {
    for (let i = 0; i < 4 && this.transition; i++) this.stepTransition(10);
    this.transition = null; this.pendingEntrance = null;
    this.rig.setPush(0); this.veilU.uAlpha.value = 0;
    this.instance?.animator.stopMovement();
    this.loadT = 99; this.instance?.setFurRamp(1);
  }
  /** True while a cinematic transition is running (tests and UI can wait on it). */
  get busy() { return !!this.transition || this.loadT < 2; }
  get isSafeMode() { return this.instance?.isSafe ?? false; }
  stats() { return { ...(this.instance?.stats() ?? { draws: 0, tris: 0 }), tier: this.tier, dpr: this.renderer.getPixelRatio(), calls: this.renderer.info.render.calls, world: this.worldId }; }

  playMovement(m: string | MovementDef, delay = 0) {
    const def = typeof m === 'string' ? MOVEMENTS[m] : m;
    if (!def || !this.instance) return;
    this.instance.animator.playMovement(def, undefined, delay);
  }
  stopMovement() { this.instance?.animator.stopMovement(); }

  /**
   * Cinematic transition: fog-and-cloud veil rises while the camera pushes in, the scene is swapped at the
   * peak, then the veil clears and the character enters. Used for world and character changes.
   */
  travel(o: TravelOptions): void {
    if (this.frozen !== null || !this.instance) { this.commitTravel(o); return; }
    if (this.transition) { this.transition.opts = { ...this.transition.opts, ...o }; return; }
    const quick = this.reduced;
    this.transition = { phase: 'in', t: 0, opts: o, dur: quick ? 0.01 : 0.6 };
  }

  /**
   * Quality change as a transaction. The new tier is applied, one frame is rendered and checked,
   * and on any failure the previous tier is restored and a lower one is attempted: ultra → high → medium → low.
   */
  setQuality(tier: QualityTier, reason: 'user' | 'adaptive' | 'fallback' = 'user'): QualityTier {
    let attempt: QualityTier = tier;
    const prev = this.tier;
    for (;;) {
      if (this.tryTier(attempt)) {
        if (attempt !== prev || reason !== 'user') this.opts.onEvent?.({ type: 'tier', tier: attempt, reason: attempt !== tier ? 'fallback' : reason });
        if (attempt !== tier) this.opts.onEvent?.({ type: 'fallback', message: `${tier} wasn't stable on this device — running ${attempt}.` });
        return attempt;
      }
      if (attempt === 'low') {
        this.tryTier(prev);
        this.instance?.setSafeMode(true);
        this.opts.onEvent?.({ type: 'fallback', message: 'Fur shaders were disabled to keep the character on screen.' });
        return this.tier;
      }
      attempt = lowerTier(attempt);
    }
  }

  private tryTier(next: QualityTier): boolean {
    const prev = this.tier;
    const prevWorld = this.world;
    try {
      this.tier = next;
      this.applyQualityToRenderer();
      this.instance?.setFurLayerScale(TIERS[next].furLayerScale);
      if (this.worldId && prev !== next) { const w = this.buildWorld(this.worldId); if (w) this.commitWorld(w, this.worldId); else throw new Error('world rebuild failed'); }
      this.renderFrame();
      const err = this.renderer.getContext().getError();
      if (err !== 0 && err !== this.renderer.getContext().CONTEXT_LOST_WEBGL) throw new Error(`GL error ${err}`);
      if (this.renderer.getContext().isContextLost()) throw new Error('context lost');
      return true;
    } catch (e) {
      console.warn('[stage] tier change failed, restoring', next, e);
      this.tier = prev;
      try { this.applyQualityToRenderer(); this.instance?.setFurLayerScale(TIERS[prev].furLayerScale); if (this.world !== prevWorld && prevWorld) { this.scene.add(prevWorld.group); this.world = prevWorld; } } catch { /* keep going */ }
      return false;
    }
  }

  setLighting(id: LightingId, instant = false) {
    if (instant) { this.pendingLight = null; this.activateLighting(id); this.envFade = 1; }
    else if (id !== this.light.id) this.pendingLight = id;
  }

  /** Renders one frame and returns it as a PNG data URL (the drawing buffer is only readable right after a render). */
  capture(): string {
    this.renderFrame();
    return this.canvas.toDataURL('image/png');
  }

  /** Static pose for thumbnails: no springs, no input, deterministic. */
  freeze(time: number, clip?: ClipId) {
    this.frozen = time;
    this.time.value = time;
    this.syncRunning();
    if (this.instance && this.config) {
      this.instance.animator.freeze(time, this.config.expression, clip);
      this.instance.update(1 / 30, time);
    }
    this.world?.update(time, 1 / 30);
    this.rig.setPreset(this.config?.camera ?? 'hero', true);
    this.camera.updateMatrixWorld();
    this.rig.update(this.camera, 0.016, 0, [0, 0], true);
    this.key.target.position.set(0, 0.7, 0);
    this.veilU.uAlpha.value = 0;
    this.instance?.setFurRamp(1);
    this.renderFrame();
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    if (this.opts.mode !== 'static') this.unbindInput();
    resetCloudCache();
    if (!this.hadLoss) {
      for (const i of this.instances.values()) i.dispose();
      this.world?.dispose();
      for (const e of this.envCache.values()) e.dispose();
      this.ground.geometry.dispose(); (this.ground.material as ShadowMaterial).dispose();
      this.blob.geometry.dispose(); (this.blob.material as MeshBasicMaterial).dispose(); this.blobTex.dispose();
      this.veil.geometry.dispose(); (this.veil.material as ShaderMaterial).dispose();
      this.key.shadow.map?.dispose();
      this.renderer.dispose();
    }
    this.instances.clear();
    this.envCache.clear();
    this.scene.clear();
    this.renderer.forceContextLoss();
  }

  // ------------------------------------------------------------------ failure handling

  private guard(fn: () => void, what: string) {
    try { fn(); } catch (e) { console.error(`[stage] ${what} failed`, e); this.onFailure(`${what} failed`); }
  }

  /** Escalating, never-blank recovery: first drop the tier, then drop shader fur, then drop the world. */
  private onFailure(message: string) {
    if (this.disposed || this.errors > 6) return;
    this.errors++;
    if (this.tier !== 'low') { this.setQuality(lowerTier(this.tier), 'fallback'); return; }
    if (this.instance && !this.instance.isSafe) { this.instance.setSafeMode(true); this.opts.onEvent?.({ type: 'fallback', message }); return; }
    if (this.world) { this.scene.remove(this.world.group); this.world = null; this.worldId = null; this.opts.onEvent?.({ type: 'fallback', message: 'The environment was simplified.' }); }
  }

  private onContextLost = (e: Event) => { e.preventDefault(); this.lost = true; this.syncRunning(); this.opts.onEvent?.({ type: 'context', lost: true }); };
  private onContextRestored = () => {
    this.lost = false;
    // Objects from the lost context are already invalid: forget them instead of disposing (which would spam GL errors).
    this.hadLoss = true;
    if (this.world) this.staleWorlds.add(this.world);
    this.envCache.clear();
    this.activateLighting(this.light.id);
    this.syncRunning();
    this.opts.onEvent?.({ type: 'context', lost: false });
  };

  // ------------------------------------------------------------------ internals

  private get reduced() { return this.reducedMq.matches; }

  private applyQualityToRenderer() {
    const q = TIERS[this.tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dprMax));
    const wasShadows = this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = q.shadows;
    this.key.castShadow = q.shadows;
    if (this.key.shadow.mapSize.x !== q.shadowMapSize) {
      this.key.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    if (wasShadows !== q.shadows) this.scene.traverse((o) => { const m = (o as Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; }); });
    if (this.resizeObs) this.resize();
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const sx = this.opts.shiftX ?? 0;
    if (sx !== 0 && w > h) this.camera.setViewOffset(w, h, -sx * w, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  private activateLighting(id: LightingId, silent = false) {
    const def = LIGHTING[id];
    let entry = this.envCache.get(id);
    if (!entry) { entry = buildEnvironmentTexture(this.renderer, def); this.envCache.set(id, entry); }
    this.light = def;
    // Characters are mostly white/cream. Bright presets were tuned for mid-tones and clip a white coat to flat paper,
    // so their light is scaled down; dark presets keep nearly their authored strength.
    this.lightK = def.ui === 'light' ? 0.8 : 0.85;
    this.envK = def.ui === 'light' ? 0.18 : 0.8;
    this.scene.environment = entry.texture;
    this.scene.environmentIntensity = def.envIntensity * this.envK;
    this.renderer.toneMappingExposure = def.exposure;
    (this.ground.material as ShadowMaterial).opacity = def.shadow * 0.7;
    this.instance?.setFurRim(def);
    const set = (l: DirectionalLight, s: LightingDef['key']) => { l.color.set(s.color); l.intensity = s.intensity * this.lightK; l.position.set(s.at[0], s.at[1] * (l === this.key ? 1.4 : 1), s.at[2]); };
    set(this.key, def.key); set(this.rim, def.rim);
    this.fill.color.set(def.fill.sky); this.fill.groundColor.set(def.fill.ground); this.fill.intensity = def.fill.intensity * this.envK;
    this.world?.applyLighting(def);
    this.applyFog();
    this.veilU.uColor.value.set(...hexToRgb(def.fog));
    void silent;
  }

  private applyFog() {
    const d = this.world?.fogDensity ?? 0;
    this.scene.fog = d > 0 ? new FogExp2(this.light.fog, d) : null;
  }

  private buildWorld(id: WorldId): WorldRuntime | null {
    try {
      const w = WORLDS[id].build({ quality: TIERS[this.tier], time: this.time, reduced: this.reduced });
      w.applyLighting(this.light);
      return w;
    } catch (e) {
      console.error('[stage] world build failed', id, e);
      return null;
    }
  }

  private commitWorld(w: WorldRuntime, id: WorldId) {
    const old = this.world;
    this.scene.add(w.group);
    this.world = w; this.worldId = id;
    this.ground.visible = !w.ownsFloor;
    this.applyFog();
    if (old) { this.scene.remove(old.group); if (!this.staleWorlds.has(old)) old.dispose(); }
  }

  /** Build-then-swap: the previous world stays until the new one exists. */
  private swapWorld(id: WorldId) {
    if (id === this.worldId && this.world) return;
    const w = this.buildWorld(id);
    if (w) this.commitWorld(w, id);
    else this.opts.onEvent?.({ type: 'fallback', message: `The ${id} environment could not be built; keeping the current one.` });
  }

  private commitTravel(o: TravelOptions) {
    const cfg = o.config ?? this.config;
    if (o.def && cfg) { void this.setMascot(o.def, cfg, { instant: true }); }
    else if (cfg) this.swapWorld(cfg.world);
    if (o.entrance) this.pendingEntrance = typeof o.entrance === 'string' ? MOVEMENTS[o.entrance] : o.entrance;
  }

  private syncRunning() {
    const should = this.visible && !document.hidden && !this.disposed && !!this.instance && this.frozen === null && !this.lost;
    if (should && !this.running) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
    else if (!should && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
  }
  private onVisibility = () => this.syncRunning();

  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const cap = TIERS[this.tier].fpsCap;
    const dtMs = now - this.last;
    if (cap && dtMs < 1000 / cap - 2) return;
    this.last = now;
    const dt = Math.min(dtMs / 1000, 0.1);
    this.elapsed += dt;
    try { this.step(dt, dtMs); } catch (e) { console.error('[stage] frame failed', e); this.onFailure('A frame failed to render'); }
  };

  private step(dt: number, dtMs: number) {
    this.time.value = this.elapsed;
    this.veilU.uTime.value = this.elapsed;
    // Lighting crossfade: dim the IBL, swap, restore.
    if (this.pendingLight) {
      this.envFade = Math.max(0, this.envFade - dt * 6);
      if (this.envFade <= 0) { this.activateLighting(this.pendingLight); this.pendingLight = null; }
      this.scene.environmentIntensity = this.light.envIntensity * this.envK * this.envFade;
    } else if (this.envFade < 1) {
      this.envFade = Math.min(1, this.envFade + dt * 3);
      this.scene.environmentIntensity = this.light.envIntensity * this.envK * this.envFade;
    }

    // Progressive load: skin first, then world fades in, then fur layers ramp up.
    if (this.loadT < 90) {
      this.loadT += dt;
      if (!this.transition) this.veilU.uAlpha.value = Math.max(0, 1 - Math.max(0, this.loadT - 0.1) / 0.8);
      this.instance?.setFurRamp(Math.min(1, Math.max(0, (this.loadT - 0.35) / 1.1)));
    }
    this.stepTransition(dt);

    const inst = this.instance;
    if (inst) {
      this.updatePointer();
      const wasPlaying = inst.animator.playing;
      const p = this.config?.params ?? DEFAULT_PARAMS;
      inst.animator.update(dt, this.elapsed, {
        gaze: this.computeGaze(), hover: this.hover, reduced: this.reduced, dragging: this.rig.isDragging,
        energy: p.motionEnergy, speed: p.animSpeed, blinkSpeed: p.blinkSpeed,
      });
      inst.update(dt, this.elapsed);
      if (wasPlaying && !inst.animator.playing) this.opts.onEvent?.({ type: 'clip', clip: null });
      const lift = inst.animator.lift;
      const off = inst.animator.rootOffset;
      const s = 1 - Math.min(0.35, lift * 1.6);
      this.blob.scale.set(1.5 * s * off.scale, 1.15 * s * off.scale, 1);
      this.blob.position.x = off.x; this.blob.position.z = off.z;
      (this.blob.material as MeshBasicMaterial).opacity = Math.max(0, this.light.shadow * 1.4 * (1 - lift * 2.2)) * (this.world?.ownsFloor ? 0.7 : 1);
    }
    this.world?.update(this.elapsed, dt);
    const ptr: [number, number] = this.pointerSeen > this.elapsed - 4 ? [this.pointer.x, this.pointer.y] : [0, 0];
    this.rig.update(this.camera, dt, this.elapsed, ptr, this.reduced);
    this.key.target.position.set(0, 0.7, 0);
    this.renderFrame();

    // Adaptive quality: sustained slow frames drop one tier (through the same safe path as user changes).
    if (this.opts.adaptive !== false && ++this.frameCount > 30 && !this.transition && this.loadT > 3) {
      this.slowFrames = dtMs > 38 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 45 && this.tier !== 'low') { this.slowFrames = 0; this.setQuality(lowerTier(this.tier), 'adaptive'); }
    }
    this.opts.onEvent?.({ type: 'frame' });
  }

  private stepTransition(dt: number) {
    const tr = this.transition;
    if (!tr) { if (this.pendingEntrance && this.instance) { this.instance.animator.playMovement(this.pendingEntrance); this.pendingEntrance = null; } return; }
    tr.t += dt;
    const k = Math.min(1, tr.t / tr.dur);
    if (tr.phase === 'in') {
      this.veilU.uAlpha.value = k * k * (3 - 2 * k);
      this.rig.setPush(k * 0.12);
      if (k >= 1) { tr.phase = 'swap'; tr.t = 0; }
    } else if (tr.phase === 'swap') {
      this.commitTravel(tr.opts);
      this.instance?.setFurRamp(1);
      tr.phase = 'out'; tr.t = 0; tr.dur = this.reduced ? 0.01 : 0.9;
    } else {
      this.veilU.uAlpha.value = 1 - k * k * (3 - 2 * k);
      this.rig.setPush(0.12 * (1 - k));
      if (k >= 1) { this.transition = null; this.rig.setPush(0); this.veilU.uAlpha.value = 0; }
    }
  }

  private renderFrame() {
    if (this.lost) return;
    this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------------ input

  private bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('pointermove', this.onMoveCanvas);
    c.addEventListener('pointerleave', this.onLeave);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('keydown', this.onKey);
    c.addEventListener('contextmenu', this.onContext);
    window.addEventListener('pointermove', this.onMoveWindow, { passive: true });
  }
  private unbindInput() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointermove', this.onMoveCanvas);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('keydown', this.onKey);
    c.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('pointermove', this.onMoveWindow);
  }

  private onContext = (e: Event) => { if (this.opts.mode === 'playground') e.preventDefault(); };
  private ndc(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)];
  }
  private onMoveWindow = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const [x, y] = this.ndc(e);
    this.pointer.set(x, y);
    this.pointerSeen = this.elapsed;
  };
  private onMoveCanvas = (e: PointerEvent) => {
    this.pointerDirty = true;
    if (this.pointers.has(e.pointerId)) {
      const prev = this.pointers.get(e.pointerId)!;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinch > 0) this.rig.zoomBy(this.pinch / d, this.elapsed);
        this.pinch = d;
        this.rig.pan((e.clientX - prev.x) * 0.5, (e.clientY - prev.y) * 0.5, this.elapsed);
      } else if (this.pointers.size === 1) {
        if (this.downAt?.pan) this.rig.pan(e.clientX - prev.x, e.clientY - prev.y, this.elapsed);
        else this.rig.drag(e.clientX - prev.x, e.clientY - prev.y, this.elapsed);
      }
    }
  };
  private onLeave = () => { this.hover = false; };
  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now(), pan: e.button === 2 || e.shiftKey };
    this.rig.beginDrag();
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (e.pointerType === 'touch') { const [x, y] = this.ndc(e); this.pointer.set(x, y); this.pointerSeen = this.elapsed; }
  };
  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    this.pinch = 0;
    if (this.pointers.size === 0) this.rig.endDrag(this.elapsed);
    const d = this.downAt;
    this.downAt = null;
    if (d && e.type === 'pointerup' && !d.pan && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 400) {
      if (this.hitTest(this.ndc(e))) this.react();
    }
  };
  private onWheel = (e: WheelEvent) => {
    if (this.opts.mode !== 'playground') return;
    e.preventDefault();
    this.rig.zoomBy(Math.exp(e.deltaY * 0.0012), this.elapsed);
  };
  private onKey = (e: KeyboardEvent) => {
    const t = this.elapsed;
    switch (e.key) {
      case 'ArrowLeft': this.rig.orbitBy(-0.2, 0, t); break;
      case 'ArrowRight': this.rig.orbitBy(0.2, 0, t); break;
      case 'ArrowUp': this.rig.orbitBy(0, -0.1, t); break;
      case 'ArrowDown': this.rig.orbitBy(0, 0.1, t); break;
      case '+': case '=': this.rig.zoomBy(0.88, t); break;
      case '-': this.rig.zoomBy(1.14, t); break;
      case 'Enter': case ' ': this.react(); break;
      default: return;
    }
    e.preventDefault();
  };

  private react() {
    const a = this.instance?.animator;
    if (a && !a.playing) this.play('poke');
  }

  private hitTest(ndc: [number, number]) {
    if (!this.instance) return false;
    this.ray.setFromCamera(new Vector2(ndc[0], ndc[1]), this.camera);
    return this.ray.intersectObjects(this.instance.hitMeshes, false).length > 0;
  }

  private updatePointer() {
    if (this.pointerDirty && !this.rig.isDragging) {
      this.hover = this.hitTest([this.pointer.x, this.pointer.y]);
      this.canvas.style.cursor = this.hover ? 'pointer' : this.opts.mode === 'playground' ? 'grab' : 'default';
    }
    this.pointerDirty = false;
  }

  /** Pointer position relative to the head on screen, so the mascot looks at the cursor itself. */
  private computeGaze(): [number, number] | null {
    if (!this.instance || this.pointerSeen < this.elapsed - 3.5) return null;
    this.instance.headObject.getWorldPosition(this.tmp);
    const head = this.tmp.project(this.camera);
    const aspect = this.camera.aspect;
    const dx = (this.pointer.x - head.x) * Math.min(1, aspect) * 1.1;
    const dy = (this.pointer.y - head.y) * 1.1;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    return [clamp(dx), clamp(dy)];
  }
}

const hexToRgb = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** Camera-attached fog/cloud wipe used for transitions and progressive loading. */
function createVeil(u: { uAlpha: IUniform<number>; uColor: IUniform<Vector3>; uTime: IUniform<number> }): Mesh {
  const m = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      uniforms: u, transparent: true, depthTest: false, depthWrite: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uAlpha, uTime; uniform vec3 uColor; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
        void main(){
          float c = n(vUv * 3.0 + uTime * 0.04) * 0.55 + n(vUv * 6.0 - uTime * 0.06) * 0.3 + n(vUv * 12.0) * 0.15;
          float a = clamp(uAlpha * 1.55 - (1.0 - c) * 0.55, 0.0, 1.0);
          gl_FragColor = vec4(mix(uColor, vec3(1.0), c * 0.35), a);
        }`,
    }),
  );
  m.frustumCulled = false;
  m.renderOrder = 999;
  return m;
}

/** Cast shadow that dissolves with distance from the mascot, so it never ends in a hard edge at the frame. */
function createFadingShadowMaterial(): ShadowMaterial {
  const m = new ShadowMaterial({ opacity: 0.25 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec2 vGroundXZ;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'varying vec2 vGroundXZ;\nvoid main() {')
      .replace('opacity * ( 1.0 - getShadowMask() )', 'opacity * ( 1.0 - getShadowMask() ) * (1.0 - smoothstep(0.2, 1.0, length(vGroundXZ)))');
  };
  return m;
}

function makeBlobTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
