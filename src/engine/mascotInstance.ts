import {
  BufferGeometry, Color, Euler, Group, InstancedMesh, IUniform, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import type { AttachPoint, MascotConfig, MascotDefinition, Params, PartDef, Role } from '../mascot/types';
import { DEFAULT_PARAMS } from '../mascot/types';
import { buildGeometry } from './geometry';
import { attachMarkings, createFurMaterial, createMarkUniforms, type FurUniforms, type MarkUniforms } from './fur';
import { SURFACES, type SurfaceDef } from './surfaces';
import type { QualitySettings } from './quality';
import { Animator } from './animation/animator';
import type { LightingDef } from './lighting';
import { ACCESSORIES, type AccessoryRig, type SwingDef } from './accessories';
import { buildCharmRail, type CharmRig } from './charms';
import { MODELS } from './models';
import { AGENT_STATES, type AgentStateDef } from './agent';
import { Tracker } from './worlds/common';

interface PartHandle {
  def: PartDef;
  group: Group;
  mesh: Mesh;
  core: Material;
  fur?: { mesh: InstancedMesh; material: MeshStandardMaterial; uniforms: FurUniforms };
  marks?: MarkUniforms;
  geometry: BufferGeometry;
  sig?: string;
}

export interface RoleBinding { obj: Object3D; p: Vector3; r: Vector3; s: Vector3; p0: Vector3; s0: Vector3 }

interface SwingState { def: SwingDef; ax: number; az: number; vx: number; vz: number; y: number; vy: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Runtime mascot: builds a scene graph from a MascotDefinition and applies a MascotConfig to it.
 * Contains no mascot-specific logic — everything comes from the definition.
 */
export class MascotInstance {
  readonly root = new Group();
  readonly hitMeshes: Mesh[] = [];
  readonly roles = new Map<Role, RoleBinding[]>();
  readonly animator: Animator;
  private parts = new Map<string, PartHandle>();
  private attachNodes = new Map<AttachPoint, Group>();
  private surface: SurfaceDef = SURFACES.smooth;
  private params: Params = { ...DEFAULT_PARAMS };
  private colorsBySlot = new Map<string, Color>();
  private furLayerScale = 1;
  private furRamp = 1;
  private safe = false;
  private tr = new Tracker();
  private accessories = new Map<string, AccessoryRig>();
  private activeAccessories = new Set<string>();
  private charmKey = '';
  private charmRig: CharmRig | null = null;
  private swings: SwingState[] = [];
  private refPrev = new Map<AttachPoint, Vector3>();
  private tmp = new Vector3();
  private propRoot = new Group();
  private propCache = new Map<string, Group>();
  private propLive: { obj: Object3D; motion?: string; base: Vector3; baseRot: Euler; baseScale: number }[] = [];
  private agent: AgentStateDef = AGENT_STATES.idle;
  private halo: { group: Group; beads: Mesh[]; mats: MeshBasicMaterial[] } | null = null;
  private time = 0;
  readonly unit: number;

  constructor(readonly def: MascotDefinition, quality: QualitySettings, private timeU: IUniform<number>) {
    this.furLayerScale = quality.furLayerScale;
    this.unit = def.framing.height / 1.95;
    const groups = new Map<string, Object3D>([['root', this.root]]);

    for (const pd of this.def.parts) {
      const group = new Group();
      group.name = pd.id;
      group.position.set(...(pd.position ?? [0, 0, 0]));
      group.rotation.set(...(pd.rotation ?? [0, 0, 0]));
      (groups.get(pd.parent ?? 'root') ?? this.root).add(group);
      groups.set(pd.id, group);

      // Fur geometry only needs to carry the silhouette; strand detail comes from the fragment shader.
      const seg = quality.sphereSegments;
      const geometry = buildGeometry(pd, pd.furry ? [Math.max(24, Math.round(seg[0] * 0.6)), Math.max(16, Math.round(seg[1] * 0.6))] : seg);
      const core = this.createCoreMaterial(pd);
      const mesh = new Mesh(geometry, core);
      mesh.position.set(...(pd.offset ?? [0, 0, 0]));
      mesh.castShadow = !['highlight', 'glow', 'blush'].includes(pd.finish);
      mesh.receiveShadow = pd.finish !== 'highlight';
      group.add(mesh);
      if (pd.hit) { mesh.userData.hit = true; this.hitMeshes.push(mesh); }

      const handle: PartHandle = { def: pd, group, mesh, core, geometry };
      if (pd.markings) { handle.marks = createMarkUniforms(); if (pd.finish === 'surface') attachMarkings(core, handle.marks); }
      if (pd.furry && pd.finish === 'surface') {
        const { material, uniforms } = createFurMaterial(this.timeU, handle.marks ?? createMarkUniforms());
        const shells = new InstancedMesh(geometry, material, 80);
        shells.position.copy(mesh.position);
        shells.frustumCulled = false; // shells extrude past the base bounds
        shells.castShadow = false; shells.receiveShadow = false; shells.visible = false;
        if (pd.furMask) { uniforms.uMaskC.value.set(...pd.furMask.center); uniforms.uMaskR.value.set(...pd.furMask.radii); }
        group.add(shells);
        handle.fur = { mesh: shells, material, uniforms };
      }
      this.parts.set(pd.id, handle);

      if (pd.role && pd.role !== 'root') {
        const list = this.roles.get(pd.role) ?? [];
        list.push({ obj: group, p: group.position.clone(), r: new Vector3().setFromEuler(group.rotation), s: group.scale.clone(), p0: group.position.clone(), s0: group.scale.clone() });
        this.roles.set(pd.role, list);
      }
    }
    this.roles.set('root', [{ obj: this.root, p: new Vector3(), r: new Vector3(), s: new Vector3(1, 1, 1), p0: new Vector3(), s0: new Vector3(1, 1, 1) }]);

    // Attach points: empty nodes parented to the body part they belong to.
    for (const [pt, a] of Object.entries(def.attach) as [AttachPoint, NonNullable<MascotDefinition['attach'][AttachPoint]>][]) {
      const n = new Group();
      n.position.set(...a.position);
      if (a.rotation) n.rotation.set(...a.rotation);
      if (pt !== 'charmRail' && pt !== 'handR' && pt !== 'handL') n.scale.setScalar(a.scale ?? 1);
      (groups.get(a.parent) ?? this.root).add(n);
      this.attachNodes.set(pt, n);
    }
    this.root.add(this.propRoot);
    this.animator = new Animator(this);
    this.buildHalo();
  }

  private createCoreMaterial(p: PartDef): Material {
    switch (p.finish) {
      case 'surface': return new MeshPhysicalMaterial({ roughness: 0.6 });
      case 'matte': return new MeshStandardMaterial({ roughness: 0.85, color: p.color ?? '#ffffff' });
      case 'pad': return new MeshStandardMaterial({ roughness: 0.7, color: p.color ?? '#3a2b2b' });
      case 'blush': return new MeshStandardMaterial({ roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      case 'gloss': return new MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.15, color: p.color ?? '#ffffff' });
      case 'iris': return new MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
      case 'eye': return new MeshPhysicalMaterial({ color: p.color ?? '#15110f', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
      case 'sclera': return new MeshPhysicalMaterial({ color: p.color ?? '#f6f1ea', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
      case 'inner': return new MeshStandardMaterial({ color: p.color ?? '#3a2024', roughness: 0.55 });
      case 'glow': return new MeshBasicMaterial({ toneMapped: false });
      case 'highlight': return new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true });
    }
  }

  // ------------------------------------------------------------------ config

  applyConfig(cfg: MascotConfig) {
    this.colorsBySlot.clear();
    for (const [slot, hex] of Object.entries(cfg.colors)) this.colorsBySlot.set(slot, new Color(hex));
    this.params = { ...DEFAULT_PARAMS, ...cfg.params };
    if (this.params.heterochromia < 0.5 && this.colorsBySlot.has('eye')) this.colorsBySlot.set('eye2', this.colorsBySlot.get('eye')!.clone());
    this.surface = SURFACES[cfg.surface];

    for (const h of this.parts.values()) {
      if (h.def.accessory) h.group.visible = cfg.accessories.includes(h.def.accessory);
      const color = h.def.slot ? this.colorsBySlot.get(h.def.slot) ?? this.defaultColor(h.def.slot) : undefined;
      if (h.def.finish === 'surface') this.applySurface(h, color!);
      else if (color) this.applyFlat(h, color);
      if (h.marks && h.def.markings) {
        const m = h.def.markings;
        h.marks.uMarkColor.value.copy(this.colorsBySlot.get(m.slot) ?? this.defaultColor(m.slot));
        h.marks.uMarkScale.value = m.scale; h.marks.uMarkCov.value = m.coverage; h.marks.uMarkSize.value = m.size;
        h.marks.uMarkKind.value = m.kind === 'spots' ? 0 : m.kind === 'rosettes' ? 1 : 2; h.marks.uMarkSeed.value = m.seed ?? 0;
      }
    }
    this.applyParams();
    this.syncAccessories(cfg.accessories);
    this.syncCharms(cfg.charms);
    this.accessoryColors();
    if (cfg.agent !== this.agent.id) this.setAgent(cfg.agent, cfg.expression);
    this.animator.setExpression(cfg.expression);
  }

  private defaultColor(slot: string) { return new Color(this.def.palette[slot] ?? '#ffffff'); }

  private applyFlat(h: PartHandle, color: Color) {
    const m = h.core as MeshStandardMaterial;
    switch (h.def.finish) {
      case 'matte': case 'pad': case 'gloss': case 'blush': m.color.copy(color); break;
      case 'glow': (m as unknown as MeshBasicMaterial).color.copy(color).multiplyScalar(1.4); break;
      case 'iris': m.color.copy(color); (m as MeshPhysicalMaterial).emissive.copy(color).multiplyScalar(0.18); break;
      default: break;
    }
  }

  private applySurface(h: PartHandle, color: Color) {
    const s = this.surface, p = this.params;
    const m = h.core as MeshPhysicalMaterial;
    const furry = !this.safe && !!h.fur && !!s.fur;
    m.color.copy(color);
    if (furry) m.color.multiplyScalar(0.62);
    const rough = clamp(s.roughness * (0.5 + p.roughness), 0, 1);
    m.roughness = furry ? 1 : rough;
    m.metalness = furry ? 0 : s.metalness;
    m.clearcoat = furry ? 0 : s.clearcoat;
    m.clearcoatRoughness = s.clearcoatRoughness;
    m.sheen = furry ? 0 : clamp(s.sheen * (0.4 + p.sheen * 1.2), 0, 1);
    m.sheenRoughness = s.sheenRoughness;
    m.sheenColor.set('#ffffff');
    const sig = `${furry}|${s.opacity ?? 1}`;
    if (sig !== h.sig) { h.sig = sig; m.transparent = (s.opacity ?? 1) < 1; m.opacity = s.opacity ?? 1; m.needsUpdate = true; }

    if (h.fur) {
      h.fur.mesh.visible = furry;
      if (furry) {
        const f = s.fur!, prof = this.def.fur, part = h.def.fur;
        const u = h.fur.uniforms;
        const fluff = clamp((prof.fluff + p.fluffiness) / 2, 0, 1);
        h.fur.material.color.copy(color);
        h.fur.material.roughness = clamp(0.8 + (p.roughness - 0.5) * 0.4, 0.5, 1);
        u.uLen.value = f.length * prof.length * p.furLength * (part?.length ?? 1) * (h.def.role === 'head' ? 0.9 : 1);
        u.uDensity.value = f.density * prof.density * p.furDensity * (part?.density ?? 1);
        u.uRoot.value = f.rootDark;
        u.uRim.value = f.rim * (0.5 + p.sheen);
        u.uGravity.value = f.gravity * prof.gravity;
        u.uLean.value = (p.furDirection - 0.5) * 1.6;
        u.uClump.value = clamp(f.clump + fluff * 0.25 - 0.1, 0, 1);
        u.uThick.value = f.thickness;
        u.uFluff.value = fluff;
        u.uSoft.value = clamp((prof.softness + p.softness) / 2, 0, 1);
        u.uVary.value = clamp((prof.variation + p.furVariation) / 2, 0, 1);
        this.setLayers(h, f.layers);
      }
    }
  }

  private setLayers(h: PartHandle, base: number) {
    if (!h.fur) return;
    const layers = Math.max(3, Math.round(base * this.furLayerScale * this.furRamp));
    h.fur.mesh.count = Math.min(layers, 80);
    h.fur.uniforms.uLayers.value = h.fur.mesh.count;
  }

  /** Face and body proportions. Bases are stored per binding so slider changes never compound. */
  private applyParams() {
    const p = this.params;
    const set = (role: Role, fn: (b: RoleBinding) => void) => this.roles.get(role)?.forEach(fn);
    for (const side of ['L', 'R'] as const) {
      set(`eye${side}` as Role, (b) => {
        b.s.set(b.s0.x * p.eyeSize, b.s0.y * p.eyeSize * (1 - p.squint * 0.55), b.s0.z * p.eyeSize);
        b.p.set(b.p0.x * p.eyeSpacing, b.p0.y, b.p0.z);
      });
      set(`iris${side}` as Role, (b) => b.s.set(b.s0.x * p.irisSize, b.s0.y * p.irisSize, b.s0.z));
      set(`pupil${side}` as Role, (b) => b.s.set(b.s0.x * p.pupilSize, b.s0.y * p.pupilSize, b.s0.z));
      set(`shine${side}` as Role, (b) => b.s.set(b.s0.x * Math.max(0.01, p.highlight), b.s0.y * Math.max(0.01, p.highlight), b.s0.z));
    }
    set('head', (b) => b.s.copy(b.s0).multiplyScalar(p.headSize));
    set('body', (b) => b.s.copy(b.s0).multiplyScalar(p.bodySize));
    for (const part of this.parts.values()) if (part.def.finish === 'highlight') (part.core as MeshBasicMaterial).opacity = clamp(p.highlight, 0, 1);
  }

  // ------------------------------------------------------------------ accessories & charms

  private syncAccessories(ids: string[]) {
    const want = new Set(ids.filter((id) => ACCESSORIES[id] && ACCESSORIES[id].attach.every((a) => this.attachNodes.has(a))));
    for (const id of this.activeAccessories) if (!want.has(id)) { this.accessories.get(id)?.nodes && Object.values(this.accessories.get(id)!.nodes).forEach((n) => { n!.visible = false; }); }
    for (const id of want) {
      let rig = this.accessories.get(id);
      if (!rig) {
        rig = ACCESSORIES[id].build(this.tr);
        for (const [pt, node] of Object.entries(rig.nodes) as [AttachPoint, Object3D][]) this.attachNodes.get(pt)!.add(node);
        this.accessories.set(id, rig);
      }
      Object.values(rig.nodes).forEach((n) => { n!.visible = true; });
    }
    this.activeAccessories = want;
    this.collectSwings();
  }

  private accessoryColors() {
    for (const rig of this.accessories.values()) for (const [slot, c] of this.colorsBySlot) rig.setColor(slot, c);
  }

  private syncCharms(ids: string[]) {
    const key = ids.join(',');
    if (key === this.charmKey) return;
    this.charmKey = key;
    const rail = this.attachNodes.get('charmRail');
    if (this.charmRig) { rail?.remove(this.charmRig.group); this.charmRig = null; }
    if (rail && ids.length) {
      this.charmRig = buildCharmRail(this.tr, ids, this.def.attach.charmRail?.scale ?? 0.12);
      rail.add(this.charmRig.group);
    }
    this.collectSwings();
  }

  private collectSwings() {
    const prev = new Map(this.swings.map((s) => [s.def.pivot, s]));
    const list: SwingDef[] = [];
    for (const id of this.activeAccessories) list.push(...(this.accessories.get(id)?.swings ?? []));
    if (this.charmRig) list.push(...this.charmRig.swings);
    this.swings = list.map((d) => prev.get(d.pivot) ?? { def: d, ax: 0, az: 0, vx: 0, vz: 0, y: 0, vy: 0 });
  }

  // ------------------------------------------------------------------ agent state, props, halo

  setAgent(id: AgentStateDef['id'], expressionFallback?: string) {
    const st = AGENT_STATES[id] ?? AGENT_STATES.idle;
    this.agent = st;
    void expressionFallback;
    this.animator.setStateClip(st.clip, !!st.sits);
    this.rebuildProps();
    this.refreshHalo();
  }
  get agentState() { return this.agent; }

  private rebuildProps() {
    for (const p of this.propLive) p.obj.parent?.remove(p.obj);
    this.propLive = [];
    const k = this.unit;
    for (const pl of this.agent.props) {
      const mount: AttachPoint | null = pl.mount === 'world' ? null : pl.mount;
      const parent = mount ? this.attachNodes.get(mount) : this.propRoot;
      if (!parent) continue;
      const def = MODELS[pl.model];
      if (!def) continue;
      const key = `${pl.model}`;
      let proto = this.propCache.get(key);
      if (!proto) { proto = def.build(this.tr); this.propCache.set(key, proto); }
      const obj = new Group(); obj.add(proto.clone(true));
      const sc = pl.scale * (mount ? 1 : k);
      obj.scale.setScalar(sc);
      if (pl.pos) obj.position.set(pl.pos[0] * k, pl.pos[1] * k, pl.pos[2] * k);
      if (pl.rot) obj.rotation.set(...pl.rot);
      if (mount) { obj.position.set(0, -0.02, 0.03); obj.scale.setScalar(pl.scale * k * 0.9); }
      parent.add(obj);
      this.propLive.push({ obj, motion: pl.motion, base: obj.position.clone(), baseRot: obj.rotation.clone(), baseScale: obj.scale.x });
    }
  }

  private buildHalo() {
    if (!this.def.attach.head) return;
    const parent = this.attachNodes.get('head')!;
    const group = new Group();
    group.position.set(0, 1.18, 0);
    const beads: Mesh[] = [], mats: MeshBasicMaterial[] = [];
    const geo = this.tr.add(new SphereGeometry(0.06, 16, 12));
    const ringMat = this.tr.add(new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.3, depthWrite: false }));
    const ring = new Mesh(this.tr.add(new TorusGeometry(0.46, 0.012, 6, 56)), ringMat);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.55, 1);
    group.add(ring); mats.push(ringMat);
    for (let i = 0; i < 3; i++) {
      const mat = this.tr.add(new MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true }));
      const m = new Mesh(geo, mat); m.scale.setScalar(1 - i * 0.16); group.add(m); beads.push(m); mats.push(mat);
    }
    group.visible = false;
    parent.add(group);
    this.halo = { group, beads, mats };
  }

  private refreshHalo() {
    if (!this.halo) return;
    this.halo.group.visible = this.agent.id !== 'idle';
    this.halo.mats.forEach((m) => m.color.set(this.agent.status.color));
  }

  // ------------------------------------------------------------------ per-frame

  update(dt: number, t: number) {
    this.time = t;
    // props
    for (const p of this.propLive) {
      if (p.motion === 'float') p.obj.position.y = p.base.y + Math.sin(t * 1.6 + p.base.x * 3) * 0.04 * this.unit;
      else if (p.motion === 'spin') p.obj.rotation.y = p.baseRot.y + t * 1.4;
      else if (p.motion === 'pulse') p.obj.scale.setScalar(p.baseScale * (1 + Math.sin(t * 4) * 0.06));
    }
    // status halo
    const h = this.halo;
    if (h && h.group.visible) {
      const st = this.agent.status;
      const spin = st.mode === 'spin' ? st.speed * 2 : st.mode === 'still' ? 0 : 0.6;
      h.beads.forEach((b, i) => {
        const a = t * spin + (i * Math.PI * 2) / 3, r = 0.46;
        b.position.set(Math.cos(a) * r, Math.sin(t * 1.2 + i) * 0.03, Math.sin(a) * r * 0.55);
      });
      let o = 1;
      if (st.mode === 'pulse') o = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.speed * 3));
      if (st.mode === 'flash') o = 0.35 + 0.65 * Math.abs(Math.sin(t * st.speed * 2.5));
      if (st.mode === 'shake') h.group.position.x = Math.sin(t * 38) * 0.03;
      else h.group.position.x = 0;
      h.mats.forEach((m, i) => { m.opacity = i === 0 ? o * 0.3 : o; });
    }
    this.stepSwings(Math.min(dt, 1 / 30));
  }

  private stepSwings(dt: number) {
    if (!this.swings.length || dt <= 0) return;
    const vel = new Map<AttachPoint, Vector3>();
    for (const s of this.swings) {
      const pt = s.def.ref;
      if (!vel.has(pt)) {
        const n = this.attachNodes.get(pt);
        if (!n) { vel.set(pt, new Vector3()); continue; }
        n.getWorldPosition(this.tmp);
        const prev = this.refPrev.get(pt);
        const v = prev ? this.tmp.clone().sub(prev).divideScalar(dt) : new Vector3();
        if (v.length() > 12) v.setLength(0);
        this.refPrev.set(pt, this.tmp.clone());
        vel.set(pt, v);
      }
      const v = vel.get(pt)!;
      const d = s.def, k = d.stiffness;
      const lagK = 1 / (1 + (d.lag ?? 0) * 0.35);
      if (d.mode === 'bounce') {
        const target = clamp(-v.y * d.gain * 0.06, -d.max * 0.3, d.max * 0.3) * lagK;
        s.vy += (k * (target - s.y) - d.damping * 2 * s.vy) * dt; s.y += s.vy * dt;
        d.pivot.position.y = s.y;
      } else {
        const tz = clamp(-v.x * d.gain * 0.45, -d.max, d.max) * lagK, tx = clamp(v.z * d.gain * 0.45 - Math.max(0, v.y) * d.gain * 0.12, -d.max, d.max) * lagK;
        s.vz += (k * (tz - s.az) - d.damping * s.vz) * dt; s.az += s.vz * dt;
        s.vx += (k * (tx - s.ax) - d.damping * s.vx) * dt; s.ax += s.vx * dt;
        // Ambient breathing sway so charms/tails never freeze dead still.
        const idle = Math.sin(this.time * 1.3 + (d.lag ?? 0)) * 0.02 * d.gain;
        d.pivot.rotation.set(s.ax, 0, s.az + idle);
      }
    }
  }

  setFurRim(env: LightingDef) {
    for (const h of this.parts.values()) h.fur?.uniforms.uRimColor.value.set(env.furRim);
  }

  /** Quality changed at runtime: re-derive shell counts without rebuilding geometry. */
  setFurLayerScale(scale: number) { this.furLayerScale = scale; this.relayer(); }
  /** Progressive loading: 0 = skin only, 1 = full fur. */
  setFurRamp(r: number) { if (Math.abs(r - this.furRamp) > 0.004) { this.furRamp = r; this.relayer(); } }
  private relayer() {
    if (!this.surface.fur) return;
    for (const h of this.parts.values()) if (h.fur?.mesh.visible) this.setLayers(h, this.surface.fur.layers);
  }
  /** Last-resort fallback: drop shader-based fur and show skin. The character stays on screen. */
  setSafeMode(on: boolean) {
    if (this.safe === on) return;
    this.safe = on;
    for (const h of this.parts.values()) if (h.def.finish === 'surface') this.applySurface(h, this.colorsBySlot.get(h.def.slot ?? '') ?? this.defaultColor(h.def.slot ?? 'body'));
  }
  get isSafe() { return this.safe; }

  get headObject(): Object3D { return this.roles.get('head')?.[0]?.obj ?? this.root; }

  /** Triangle count of everything currently drawn (shells included). */
  stats() {
    let draws = 0, tris = 0;
    for (const h of this.parts.values()) {
      if (!h.group.visible) continue;
      const idx = h.geometry.index?.count ?? 0;
      draws++; tris += idx / 3;
      if (h.fur?.mesh.visible) { draws++; tris += (idx / 3) * h.fur.mesh.count; }
    }
    return { draws, tris: Math.round(tris) };
  }

  dispose() {
    for (const h of this.parts.values()) { h.geometry.dispose(); h.core.dispose(); h.fur?.material.dispose(); h.fur?.mesh.dispose(); }
    this.tr.dispose();
    this.parts.clear(); this.root.clear(); this.hitMeshes.length = 0; this.roles.clear(); this.swings = [];
  }
}
