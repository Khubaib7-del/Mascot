import {
  AdditiveBlending, BackSide, BufferGeometry, CanvasTexture, Color, ConeGeometry, Float32BufferAttribute, Group, IUniform,
  LineSegments, Mesh, MeshStandardMaterial, Points, ShaderMaterial, Sprite, SpriteMaterial, SRGBColorSpace, SphereGeometry,
  CylinderGeometry, Vector3, type Material,
} from 'three';
import type { LightingDef } from '../lighting';
import type { QualitySettings } from '../quality';
import type { WorldId } from '../../mascot/types';

export interface WorldContext { quality: QualitySettings; time: IUniform<number>; reduced: boolean }

export interface WorldRuntime {
  group: Group;
  /** Characters stand on y = 0. Worlds that draw their own floor receive shadows themselves. */
  ownsFloor: boolean;
  fogDensity: number;
  update(t: number, dt: number): void;
  applyLighting(l: LightingDef): void;
  dispose(): void;
}

export interface WorldDef {
  id: WorldId;
  label: string;
  note: string;
  defaultLighting: LightingDef['id'];
  build(ctx: WorldContext): WorldRuntime;
}

/** Collects everything a world allocates so dispose() is exhaustive. */
export class Tracker {
  private items: { dispose(): void }[] = [];
  add<T extends { dispose(): void }>(x: T): T { this.items.push(x); return x; }
  mesh<M extends Material>(geo: BufferGeometry, mat: M): Mesh<BufferGeometry, M> {
    this.add(geo); this.add(mat);
    return new Mesh(geo, mat);
  }
  dispose() { for (const i of this.items) i.dispose(); this.items.length = 0; }
}

export const standard = (color: string, rough = 0.9, extra: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

export const emissive = (color: string, intensity = 1.5) =>
  new MeshStandardMaterial({ color: '#000', emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.6 });

// ---------------------------------------------------------------- noise
const h2 = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise2(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x: number, y: number) => noise2(x, y) * 0.55 + noise2(x * 2.1, y * 2.1) * 0.3 + noise2(x * 4.3, y * 4.3) * 0.15;
export function rng(seed: number) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, tr?: Tracker): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  tr?.add(t);
  return t;
}

// ---------------------------------------------------------------- sky
export interface Sky { mesh: Mesh; apply(l: LightingDef): void; uniforms: Record<string, IUniform> }

export function makeSky(tr: Tracker, time: IUniform<number>): Sky {
  const uniforms: Record<string, IUniform> = {
    uTop: { value: new Color() }, uHorizon: { value: new Color() }, uGround: { value: new Color() }, uSun: { value: new Color() },
    uSunDir: { value: new Vector3(0, 0.3, 1) }, uGlow: { value: 0.5 }, uStars: { value: 0 }, uTime: time,
  };
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uGround, uSun, uSunDir; uniform float uGlow, uStars, uTime; varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, y), 0.55)) : mix(uHorizon, uGround, smoothstep(0.0, -0.3, y));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        c += uSun * (pow(s, 6.0) * 0.28 + pow(s, 80.0) * 0.5 + pow(s, 900.0) * 2.5) * uGlow;
        vec3 q = floor(d * 160.0); float h = hash(q);
        float star = step(0.9965, h) * (0.6 + 0.4 * sin(uTime * 2.0 + h * 80.0)) * smoothstep(-0.1, 0.2, y);
        c += vec3(star) * uStars;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(tr.add(new SphereGeometry(90, 40, 24)), tr.add(mat));
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return {
    mesh, uniforms,
    apply(l) {
      (uniforms.uTop.value as Color).set(l.sky.top); (uniforms.uHorizon.value as Color).set(l.sky.horizon);
      (uniforms.uGround.value as Color).set(l.sky.ground); (uniforms.uSun.value as Color).set(l.sky.sun);
      (uniforms.uSunDir.value as Vector3).set(...l.sky.sunAt); uniforms.uGlow.value = l.sky.sunGlow; uniforms.uStars.value = l.stars;
    },
  };
}

// ---------------------------------------------------------------- particles
export interface ParticleOpts {
  count: number; extent: [number, number, number]; base?: [number, number, number];
  speed: number; size: number; color: string; sway?: number; alpha?: number; additive?: boolean; twinkle?: number; streak?: number;
}

export function particles(o: ParticleOpts, tr: Tracker, time: IUniform<number>, reduced: boolean) {
  const n = o.count, streak = o.streak ?? 0;
  const verts = streak ? 2 : 1;
  const pos = new Float32Array(n * verts * 3), seed = new Float32Array(n * verts), end = new Float32Array(n * verts);
  const r = rng(o.count + Math.round(o.speed * 10));
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * o.extent[0], y = r() * o.extent[1], z = (r() - 0.5) * o.extent[2], s = r();
    for (let v = 0; v < verts; v++) { const k = i * verts + v; pos.set([x, y, z], k * 3); seed[k] = s; end[k] = v; }
  }
  const g = tr.add(new BufferGeometry());
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('seed', new Float32BufferAttribute(seed, 1));
  g.setAttribute('end', new Float32BufferAttribute(end, 1));
  g.boundingSphere = null;
  const uniforms = {
    uTime: time, uSpeed: { value: reduced ? 0 : o.speed }, uSize: { value: o.size }, uSway: { value: reduced ? 0 : o.sway ?? 0 },
    uH: { value: o.extent[1] }, uBase: { value: new Vector3(...(o.base ?? [0, 0, 0])) }, uColor: { value: new Color(o.color) },
    uAlpha: { value: o.alpha ?? 1 }, uTwinkle: { value: o.twinkle ?? 0 }, uStreak: { value: streak },
  };
  const m = tr.add(new ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, ...(o.additive ? { blending: AdditiveBlending } : {}),
    vertexShader: /* glsl */ `
      attribute float seed; attribute float end; uniform float uTime, uSpeed, uSize, uSway, uH, uStreak, uTwinkle; uniform vec3 uBase; varying float vA;
      void main(){
        vec3 p = position;
        float fall = uTime * uSpeed * (0.6 + seed * 0.8);
        p.y = mod(p.y - fall, uH);
        p.x += sin(uTime * 0.5 + seed * 40.0) * uSway; p.z += cos(uTime * 0.4 + seed * 30.0) * uSway;
        p += uBase; p.y += end * uStreak;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * (0.5 + seed) * 700.0 / max(-mv.z, 0.1), 1.0, 12.0);
        float edge = smoothstep(0.0, 0.1 * uH, p.y - uBase.y) * smoothstep(uH, uH * 0.85, p.y - uBase.y);
        vA = edge * (1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * 2.5 + seed * 60.0)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha, uStreak; varying float vA;
      void main(){
        float a = 1.0;
        if (uStreak <= 0.0) { float d = length(gl_PointCoord - 0.5); a = smoothstep(0.5, 0.05, d); }
        gl_FragColor = vec4(uColor, a * uAlpha * vA);
      }`,
  }));
  const obj = streak ? new LineSegments(g, m) : new Points(g, m);
  obj.frustumCulled = false;
  return { obj, uniforms };
}

// ---------------------------------------------------------------- clouds
let cloudTexCache: CanvasTexture | null = null;
export function cloudTexture(tr: Tracker) {
  if (cloudTexCache) return cloudTexCache;
  const t = canvasTex(256, 128, (g) => {
    const r = rng(7);
    for (let i = 0; i < 26; i++) {
      const x = 40 + r() * 176, y = 50 + r() * 40 - Math.abs(x - 128) * 0.12, rad = 22 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    }
  }, tr);
  cloudTexCache = t;
  return t;
}
export const resetCloudCache = () => { cloudTexCache = null; };

export interface Clouds { group: Group; tint(c: string, a: number): void; update(t: number): void }
export function clouds(tr: Tracker, o: { count: number; radius: [number, number]; y: [number, number]; size: [number, number]; drift: number; seed: number }): Clouds {
  const group = new Group();
  const tex = cloudTexture(tr);
  const r = rng(o.seed);
  const mats: SpriteMaterial[] = [];
  const sprites: { s: Sprite; a: number; rad: number; sp: number }[] = [];
  for (let i = 0; i < o.count; i++) {
    const m = tr.add(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.55 + r() * 0.35 }));
    mats.push(m);
    const s = new Sprite(m);
    const a = r() * Math.PI * 2, rad = o.radius[0] + r() * (o.radius[1] - o.radius[0]);
    const size = o.size[0] + r() * (o.size[1] - o.size[0]);
    s.scale.set(size, size * 0.5, 1);
    s.position.set(Math.sin(a) * rad, o.y[0] + r() * (o.y[1] - o.y[0]), -Math.abs(Math.cos(a)) * rad);
    sprites.push({ s, a, rad, sp: 0.4 + r() });
    group.add(s);
  }
  return {
    group,
    tint(c, a) { for (const m of mats) { m.color.set('#ffffff').lerp(new Color(c), a); } },
    update(t) { for (const c of sprites) c.s.position.x += Math.sin(t * 0.05 * c.sp + c.a) * o.drift * 0.016; },
  };
}

// ---------------------------------------------------------------- terrain pieces
export function peak(tr: Tracker, h: number, r: number, seed: number, rock = '#7d8798', snow = '#f4f8ff'): Mesh {
  const geo = new ConeGeometry(r, h, 36, 18, true);
  geo.translate(0, h / 2, 0);
  const p = geo.getAttribute('position');
  const col = new Float32Array(p.count * 3);
  const rockC = new Color(rock), darkC = new Color(rock).multiplyScalar(0.55), snowC = new Color(snow), c = new Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x), t = y / h;
    const ridge = (fbm(Math.cos(ang) * 2.2 + seed, Math.sin(ang) * 2.2 + t * 2) - 0.5) * 0.9;
    const k = 1 + ridge * (0.55 - t * 0.2);
    p.setXYZ(i, x * k, y + (noise2(ang * 3 + seed, t * 5) - 0.5) * h * 0.05, z * k);
    const n = fbm(x * 0.4 + seed, y * 0.35 + z * 0.4);
    c.copy(darkC).lerp(rockC, Math.min(1, n * 1.6));
    const line = 0.42 + (n - 0.5) * 0.3;
    c.lerp(snowC, Math.min(1, Math.max(0, (t - line) / 0.1)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return tr.mesh(geo, new MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
}

/** Small floating island: rocky underside, grass top, optional castle. Origin = top surface centre. */
export function floatingIsland(tr: Tracker, o: { r: number; castle?: boolean; seed?: number; grass?: string }): Group {
  const g = new Group();
  const grass = tr.mesh(new SphereGeometry(o.r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), standard(o.grass ?? '#8fc47a', 1));
  grass.scale.y = 0.14; grass.receiveShadow = true; g.add(grass);
  const under = tr.mesh(new ConeGeometry(o.r * 0.98, o.r * 1.5, 24, 6), standard('#7a6a68', 1));
  under.rotation.x = Math.PI; under.position.y = -o.r * 0.75;
  const up = under.geometry.getAttribute('position');
  for (let i = 0; i < up.count; i++) up.setXYZ(i, up.getX(i) * (1 + (noise2(i * 0.7, 3) - 0.5) * 0.25), up.getY(i), up.getZ(i) * (1 + (noise2(i * 0.3, 9) - 0.5) * 0.25));
  up.needsUpdate = true; under.geometry.computeVertexNormals();
  g.add(under);
  if (o.castle) {
    const stone = standard('#efe7f2', 0.9), roof = standard('#8a6fd0', 0.7);
    const s = o.r * 0.28;
    for (const [x, z, w, hh] of [[0, 0, 1, 1.6], [-0.9, 0.2, 0.6, 1.1], [0.9, -0.1, 0.6, 1.25]] as number[][]) {
      const tower = tr.mesh(new CylinderGeometry(w * s * 0.75, w * s * 0.75, hh * s, 16), stone);
      tower.position.set(x * s, hh * s * 0.5, z * s); tower.castShadow = true;
      const cap = tr.mesh(new ConeGeometry(w * s * 0.95, hh * s * 0.7, 16), roof);
      cap.position.set(x * s, hh * s + hh * s * 0.35, z * s); cap.castShadow = true;
      g.add(tower, cap);
    }
  }
  return g;
}
