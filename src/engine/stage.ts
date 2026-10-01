import {
  CanvasTexture, DirectionalLight, HemisphereLight, IUniform, Mesh, MeshBasicMaterial,
  NeutralToneMapping, PCFShadowMap, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShadowMaterial, SRGBColorSpace,
  Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { CameraPresetId, ClipId, EnvironmentId, MascotConfig, MascotDefinition } from '../mascot/types';
import { defaultConfig } from '../mascot/config';
import { MascotInstance } from './mascotInstance';
import { CameraRig, type RigOptions } from './camera';
import { buildEnvironmentTexture, ENVIRONMENTS, type EnvironmentDef } from './environments';
import { detectTier, lowerTier, TIERS, type QualityTier } from './quality';

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
  | { type: 'tier'; tier: QualityTier }
  | { type: 'clip'; clip: ClipId | null };

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(30, 1, 0.1, 60);
  private rig: CameraRig;
  private instance: MascotInstance | null = null;
  private config: MascotConfig | null = null;
  private key = new DirectionalLight();
  private rim = new DirectionalLight();
  private fill = new HemisphereLight();
  private ground: Mesh;
  private blob: Mesh;
  private blobTex: Texture;
  private time: IUniform<number> = { value: 0 };
  private envCache = new Map<EnvironmentId, { texture: Texture; dispose: () => void }>();
  private env: EnvironmentDef = ENVIRONMENTS.studio;
  private envFade = 1;
  private pendingEnv: EnvironmentId | null = null;
  private tier: QualityTier;
  private raf = 0;
  private running = false;
  private disposed = false;
  private visible = true;
  private last = 0;
  private elapsed = 0;
  private slowFrames = 0;
  private frameCount = 0;
  private pointer = new Vector2(10, 10);
  private pointerSeen = -99;
  private pointerDirty = false;
  private hover = false;
  private downAt: { x: number; y: number; t: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private ray = new Raycaster();
  private reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObs: ResizeObserver;
  private io: IntersectionObserver;
  private tmp = new Vector3();
  private frozen: number | null = null;

  constructor(readonly canvas: HTMLCanvasElement, private opts: StageOptions) {
    this.tier = opts.quality ?? detectTier();
    const q = TIERS[this.tier];
    this.renderer = new WebGLRenderer({ canvas, antialias: q.msaa, alpha: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Khronos PBR Neutral keeps brand colours intact where ACES would desaturate them.
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const rigOpts: RigOptions =
      opts.mode === 'playground'
        ? { zoom: true, orbit: true, returnToPreset: false, parallax: 0.3 }
        : opts.mode === 'hero'
          ? { zoom: false, orbit: true, returnToPreset: true, parallax: 1 }
          : { zoom: false, orbit: false, returnToPreset: false, parallax: 0 };
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
    this.blob.position.y = 0.002;
    this.blob.renderOrder = -1;
    this.scene.add(this.blob);

    this.applyQualityToRenderer();
    this.setEnvironment(ENVIRONMENTS.studio.id, true);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.io = new IntersectionObserver(([e]) => { this.visible = !!e?.isIntersecting; this.syncRunning(); });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (opts.mode !== 'static') this.bindInput();
    this.resize();
  }

  // ------------------------------------------------------------------ public API

  async setMascot(def: MascotDefinition, config?: MascotConfig) {
    if (def.source.type !== 'procedural') throw new Error('GLB mascots are not wired up in this prototype (see ARCHITECTURE.md, asset pipeline).');
    if (this.instance) { this.scene.remove(this.instance.root); this.instance.dispose(); }
    const inst = new MascotInstance(def, TIERS[this.tier], this.time);
    this.instance = inst;
    this.scene.add(inst.root);
    this.rig.setFraming(def);
    this.config = config ?? defaultConfig(def);
    this.setEnvironment(this.config.environment, true);
    inst.applyConfig(this.config);
    inst.setFurRim(this.env);
    this.rig.setPreset(this.config.camera, true);
    this.syncRunning();
  }

  applyConfig(config: MascotConfig) {
    const prev = this.config;
    this.config = config;
    this.instance?.applyConfig(config);
    if (!prev || prev.environment !== config.environment) this.setEnvironment(config.environment);
    if (!prev || prev.camera !== config.camera) this.rig.setPreset(config.camera);
  }

  setCameraPreset(id: CameraPresetId) { this.rig.setPreset(id); }
  play(id: ClipId) { this.instance?.animator.play(id); this.opts.onEvent?.({ type: 'clip', clip: id }); }
  stopClip() { this.instance?.animator.stop(); }
  get playing() { return this.instance?.animator.playing ?? null; }
  get qualityTier() { return this.tier; }
  stats() { return { ...(this.instance?.stats() ?? { draws: 0, tris: 0 }), tier: this.tier, dpr: this.renderer.getPixelRatio() }; }

  setQuality(tier: QualityTier) {
    this.tier = tier;
    this.applyQualityToRenderer();
    this.instance?.setFurLayerScale(TIERS[tier].furLayerScale);
    this.opts.onEvent?.({ type: 'tier', tier });
  }

  setEnvironment(id: EnvironmentId, instant = false) {
    if (instant) {
      this.pendingEnv = null;
      this.activateEnvironment(id);
      this.envFade = 1;
    } else if (id !== this.env.id) {
      this.pendingEnv = id;
    }
  }

  /** Renders one frame and returns it as a PNG data URL (the drawing buffer is only readable right after a render). */
  capture(): string {
    this.renderFrame();
    return this.canvas.toDataURL('image/png');
  }

  /** Static pose for thumbnails: no springs, no input, deterministic. */
  freeze(time: number, clip?: ClipId) {
    this.frozen = time;
    this.syncRunning();
    this.time.value = time;
    if (this.instance && this.config) this.instance.animator.freeze(time, this.config.expression, clip);
    this.rig.setPreset(this.config?.camera ?? 'hero', true);
    this.camera.updateMatrixWorld();
    this.rig.update(this.camera, 0.016, 0, [0, 0], true);
    this.key.target.position.set(0, 0.7, 0);
    this.renderFrame();
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.opts.mode !== 'static') this.unbindInput();
    this.instance?.dispose();
    for (const e of this.envCache.values()) e.dispose();
    this.envCache.clear();
    this.ground.geometry.dispose(); (this.ground.material as ShadowMaterial).dispose();
    this.blob.geometry.dispose(); (this.blob.material as MeshBasicMaterial).dispose(); this.blobTex.dispose();
    this.key.shadow.map?.dispose();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ------------------------------------------------------------------ internals

  private get reduced() { return this.reducedMq.matches; }

  private applyQualityToRenderer() {
    const q = TIERS[this.tier];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dprMax));
    this.renderer.shadowMap.enabled = q.shadows;
    this.key.castShadow = q.shadows;
    if (this.key.shadow.mapSize.x !== q.shadowMapSize) {
      this.key.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
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

  private activateEnvironment(id: EnvironmentId) {
    const def = ENVIRONMENTS[id];
    let entry = this.envCache.get(id);
    if (!entry) { entry = buildEnvironmentTexture(this.renderer, def); this.envCache.set(id, entry); }
    this.env = def;
    this.scene.environment = entry.texture;
    this.scene.environmentIntensity = def.envIntensity;
    this.renderer.toneMappingExposure = def.exposure;
    (this.ground.material as ShadowMaterial).opacity = def.shadow * 0.7;
    this.instance?.setFurRim(def);
    const set = (l: DirectionalLight, s: EnvironmentDef['key']) => { l.color.set(s.color); l.intensity = s.intensity; l.position.set(s.at[0], s.at[1] * (l === this.key ? 1.4 : 1), s.at[2]); };
    set(this.key, def.key); set(this.rim, def.rim);
    this.fill.color.set(def.fill.sky); this.fill.groundColor.set(def.fill.ground); this.fill.intensity = def.fill.intensity;
  }

  private syncRunning() {
    const should = this.visible && !document.hidden && !this.disposed && !!this.instance && this.frozen === null;
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
    this.elapsed += Math.min(dtMs / 1000, 0.1);
    this.step(Math.min(dtMs / 1000, 0.1), dtMs);
  };

  private step(dt: number, dtMs: number) {
    this.time.value = this.elapsed;
    // Environment crossfade: dim the IBL, swap, restore.
    if (this.pendingEnv) {
      this.envFade = Math.max(0, this.envFade - dt * 6);
      if (this.envFade <= 0) { this.activateEnvironment(this.pendingEnv); this.pendingEnv = null; }
      this.scene.environmentIntensity = this.env.envIntensity * this.envFade;
    } else if (this.envFade < 1) {
      this.envFade = Math.min(1, this.envFade + dt * 3);
      this.scene.environmentIntensity = this.env.envIntensity * this.envFade;
    }

    const inst = this.instance;
    if (inst) {
      this.updatePointer();
      const wasPlaying = inst.animator.playing;
      inst.animator.update(dt, this.elapsed, { gaze: this.computeGaze(), hover: this.hover, reduced: this.reduced, dragging: this.rig.isDragging });
      if (wasPlaying && !inst.animator.playing) this.opts.onEvent?.({ type: 'clip', clip: null });
      const lift = inst.animator.lift;
      const s = 1 - Math.min(0.35, lift * 1.6);
      this.blob.scale.set(1.5 * s, 1.15 * s, 1);
      (this.blob.material as MeshBasicMaterial).opacity = Math.max(0, this.env.shadow * 1.4 * (1 - lift * 2.2));
    }
    const ptr: [number, number] = this.pointerSeen > this.elapsed - 4 ? [this.pointer.x, this.pointer.y] : [0, 0];
    this.rig.update(this.camera, dt, this.elapsed, ptr, this.reduced);
    this.key.target.position.set(0, 0.7, 0);
    this.renderFrame();

    // Adaptive quality: sustained slow frames drop one tier.
    if (this.opts.adaptive !== false && ++this.frameCount > 30) {
      this.slowFrames = dtMs > 38 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 45 && this.tier !== 'low') { this.slowFrames = 0; this.setQuality(lowerTier(this.tier)); }
    }
    this.opts.onEvent?.({ type: 'frame' });
  }

  private renderFrame() {
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
    window.removeEventListener('pointermove', this.onMoveWindow);
  }

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
      } else if (this.pointers.size === 1) {
        this.rig.drag(e.clientX - prev.x, e.clientY - prev.y, this.elapsed);
      }
    }
  };
  private onLeave = () => { this.hover = false; };
  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
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
    if (d && e.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 400) {
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

