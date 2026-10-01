import {
  BoxGeometry, BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, InstancedMesh,
  Matrix4, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, Shape, SphereGeometry,
  TorusGeometry, Vector3,
} from 'three';
import { canvasTex, rng, Tracker } from './worlds/common';

/**
 * A small library of original objects built from primitives. Props (hand-held / on the desk) and
 * collectible charms share these models at different scales. Every model is ~1 unit wide at scale 1,
 * origin at its visual centre, +Z toward the viewer.
 */
export interface ModelDef {
  id: string;
  label: string;
  category: 'dev' | 'write' | 'research' | 'office' | 'ship' | 'security' | 'create' | 'play' | 'badge';
  build(tr: Tracker): Group;
  /** Emissive parts keep their glow when scaled down to a charm. */
  glows?: boolean;
}

type Mat = MeshStandardMaterial | MeshPhysicalMaterial;
class Kit {
  private cache = new Map<string, Mat>();
  constructor(private tr: Tracker) {}
  m(color: string, rough = 0.55, metal = 0, extra: Partial<MeshStandardMaterial> = {}): Mat {
    const k = `${color}|${rough}|${metal}|${JSON.stringify(extra)}`;
    let m = this.cache.get(k);
    if (!m) { m = this.tr.add(new MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra })); this.cache.set(k, m); }
    return m;
  }
  glow(color: string, i = 2) { return this.m('#000000', 0.5, 0, { emissive: new Color(color), emissiveIntensity: i }); }
  mesh(geo: BufferGeometry, mat: Mat | MeshBasicMaterial, x = 0, y = 0, z = 0): Mesh { const me = new Mesh(this.tr.add(geo), mat); me.position.set(x, y, z); me.castShadow = true; return me; }
  box(w: number, h: number, d: number, mat: Mat, x = 0, y = 0, z = 0) { return this.mesh(new BoxGeometry(w, h, d), mat, x, y, z); }
  cyl(rt: number, rb: number, h: number, mat: Mat, x = 0, y = 0, z = 0, seg = 24) { return this.mesh(new CylinderGeometry(rt, rb, h, seg), mat, x, y, z); }
  sph(r: number, mat: Mat, x = 0, y = 0, z = 0) { return this.mesh(new SphereGeometry(r, 20, 14), mat, x, y, z); }
  tor(r: number, t: number, mat: Mat, x = 0, y = 0, z = 0, arc = Math.PI * 2) { return this.mesh(new TorusGeometry(r, t, 12, 32, arc), mat, x, y, z); }
  extrude(shape: Shape, depth: number, mat: Mat, bevel = 0.02) {
    const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12 });
    g.center(); return this.mesh(g, mat);
  }
}
const grp = (...c: Mesh[]) => { const g = new Group(); g.add(...c); return g; };

const heart = () => { const s = new Shape(); s.moveTo(0, -0.38); s.bezierCurveTo(-0.62, 0.02, -0.32, 0.5, 0, 0.18); s.bezierCurveTo(0.32, 0.5, 0.62, 0.02, 0, -0.38); return s; };
const bolt = () => { const s = new Shape(); s.moveTo(0.1, 0.5); s.lineTo(-0.28, -0.06); s.lineTo(-0.02, -0.06); s.lineTo(-0.12, -0.5); s.lineTo(0.3, 0.1); s.lineTo(0.03, 0.1); s.closePath(); return s; };
const star = () => { const s = new Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.2 : 0.46, a = (i * Math.PI) / 5 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };
const shield = () => { const s = new Shape(); s.moveTo(0, 0.5); s.lineTo(0.38, 0.38); s.quadraticCurveTo(0.4, -0.2, 0, -0.52); s.quadraticCurveTo(-0.4, -0.2, -0.38, 0.38); s.closePath(); return s; };
const hex = (r: number) => { const s = new Shape(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; };

const tex = (tr: Tracker, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => canvasTex(w, h, draw, tr);

/** The platform mark, drawn tiny on lids and badges. */
function drawMark(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 3; c.beginPath(); c.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.3, 0, 7); c.fill(); }
}

const defs: Record<string, Omit<ModelDef, 'id'>> = {
  laptop: {
    label: 'Laptop', category: 'dev', glows: true,
    build(tr) {
      const k = new Kit(tr), g = new Group();
      g.add(k.box(1, 0.04, 0.7, k.m('#c9ccd4', 0.35, 0.8), 0, 0, 0));
      const code = tex(tr, 256, 160, (c) => { c.fillStyle = '#0f131b'; c.fillRect(0, 0, 256, 160); const r = rng(2); const p = ['#7fd4ff', '#ffb86b', '#b6f08a', '#e39bff']; for (let y = 14; y < 150; y += 14) { let x = 12 + r() * 30; for (let i = 0; i < 4; i++) { const w = 14 + r() * 50; c.fillStyle = p[Math.floor(r() * 4)]; c.fillRect(x, y, w, 6); x += w + 8; } } });
      const lid = new Group(); lid.position.set(0, 0.02, -0.34); lid.rotation.x = -0.28;
      lid.add(k.box(1, 0.66, 0.03, k.m('#c9ccd4', 0.35, 0.8), 0, 0.33, 0));
      const scr = new Mesh(tr.add(new PlaneGeometry(0.92, 0.58)), tr.add(new MeshBasicMaterial({ map: code, toneMapped: false }))); scr.position.set(0, 0.33, 0.017); lid.add(scr);
      const logo = tex(tr, 64, 64, (c) => drawMark(c, 32, 32, 26, '#ffffff'));
      const decal = new Mesh(tr.add(new PlaneGeometry(0.16, 0.16)), tr.add(new MeshBasicMaterial({ map: logo, transparent: true, toneMapped: false }))); decal.position.set(0, 0.33, -0.017); decal.rotation.y = Math.PI; lid.add(decal);
      g.add(lid);
      return g;
    },
  },
  monitor: { label: 'Monitor', category: 'dev', glows: true, build(tr) { const k = new Kit(tr); return grp(k.box(1, 0.62, 0.05, k.m('#16181d', 0.4)), k.mesh(new PlaneGeometry(0.93, 0.55), tr.add(new MeshBasicMaterial({ color: '#4aa3ff', toneMapped: false })), 0, 0, 0.03), k.box(0.08, 0.3, 0.05, k.m('#2a2d35'), 0, -0.4, -0.02), k.box(0.4, 0.03, 0.2, k.m('#2a2d35'), 0, -0.55, 0)); } },
  table: {
    label: 'Low table', category: 'office',
    build(tr) { const k = new Kit(tr), g = new Group(), w = k.m('#c8a27a', 0.6); g.add(k.box(1, 0.05, 0.6, w, 0, -0.025, 0)); for (const [x, z] of [[-0.44, -0.24], [0.44, -0.24], [-0.44, 0.24], [0.44, 0.24]]) g.add(k.box(0.05, 0.45, 0.05, k.m('#8a6244', 0.7), x, -0.275, z)); return g; },
  },
  keyboard: {
    label: 'Keyboard', category: 'dev',
    build(tr) {
      const k = new Kit(tr), g = new Group(); g.add(k.box(1, 0.05, 0.36, k.m('#2e3139', 0.5)));
      const keys = new InstancedMesh(tr.add(new BoxGeometry(0.058, 0.03, 0.058)), k.m('#d7dbe3', 0.5), 60); const m = new Matrix4();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) { m.setPosition(-0.45 + c * 0.0645, 0.04, -0.12 + r * 0.08); keys.setMatrixAt(r * 15 + c, m); }
      g.add(keys); return g;
    },
  },
  terminal: {
    label: 'Terminal', category: 'dev', glows: true,
    build(tr) { const k = new Kit(tr); const t = tex(tr, 128, 96, (c) => { c.fillStyle = '#0c1118'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#7dffb0'; c.font = 'bold 56px monospace'; c.fillText('>_', 18, 66); }); return grp(k.box(0.9, 0.66, 0.1, k.m('#262a33', 0.4, 0.3)), k.mesh(new PlaneGeometry(0.8, 0.56), tr.add(new MeshBasicMaterial({ map: t, toneMapped: false })), 0, 0, 0.056)); },
  },
  database: { label: 'Database', category: 'dev', build(tr) { const k = new Kit(tr), b = k.m('#4a7bff', 0.35, 0.2), r = k.m('#d9e4ff', 0.3, 0.4); const g = new Group(); for (let i = 0; i < 3; i++) { g.add(k.cyl(0.36, 0.36, 0.2, b, 0, -0.28 + i * 0.28, 0), k.tor(0.365, 0.02, r, 0, -0.18 + i * 0.28, 0)); g.children[g.children.length - 1].rotation.x = Math.PI / 2; } return g; } },
  cloud: { label: 'Cloud', category: 'ship', build(tr) { const k = new Kit(tr), w = k.m('#ffffff', 0.7); return grp(k.sph(0.26, w, -0.25, -0.05, 0), k.sph(0.34, w, 0, 0.08, 0), k.sph(0.27, w, 0.28, -0.04, 0), k.box(0.6, 0.2, 0.4, w, 0.02, -0.12, 0)); } },
  server: {
    label: 'Server', category: 'ship', glows: true,
    build(tr) { const k = new Kit(tr), g = new Group(); for (let i = 0; i < 3; i++) { g.add(k.box(0.8, 0.22, 0.5, k.m('#30343f', 0.4, 0.5), 0, -0.26 + i * 0.26, 0)); for (let j = 0; j < 3; j++) g.add(k.sph(0.025, k.glow(j === 2 && i === 1 ? '#ffb347' : '#5dffa0'), -0.3 + j * 0.07, -0.26 + i * 0.26, 0.26)); } return g; },
  },
  document: {
    label: 'Document', category: 'write',
    build(tr) { const k = new Kit(tr); const t = tex(tr, 96, 128, (c) => { c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, 96, 128); c.fillStyle = '#9aa1b0'; for (let y = 22; y < 112; y += 10) c.fillRect(14, y, y % 20 ? 60 : 68, 3); c.fillStyle = '#3b5bdb'; c.fillRect(14, 10, 34, 5); }); return grp(k.box(0.62, 0.82, 0.03, k.m('#ffffff', 0.7, 0, { map: t }))); },
  },
  spreadsheet: {
    label: 'Spreadsheet', category: 'office',
    build(tr) { const k = new Kit(tr); const t = tex(tr, 128, 128, (c) => { c.fillStyle = '#f4fbf6'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#2f9e62'; c.lineWidth = 2; for (let i = 0; i <= 128; i += 21) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); } c.fillStyle = '#2f9e62'; c.fillRect(0, 0, 128, 21); }); return grp(k.box(0.78, 0.78, 0.03, k.m('#ffffff', 0.7, 0, { map: t }))); },
  },
  calculator: {
    label: 'Calculator', category: 'office',
    build(tr) { const k = new Kit(tr); const t = tex(tr, 96, 128, (c) => { c.fillStyle = '#23262e'; c.fillRect(0, 0, 96, 128); c.fillStyle = '#9fe8c0'; c.fillRect(10, 10, 76, 22); c.fillStyle = '#e8eaf0'; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { c.fillStyle = q === 3 ? '#ff9f4a' : '#e8eaf0'; c.fillRect(10 + q * 20, 44 + r * 20, 16, 14); } }); return grp(k.box(0.5, 0.74, 0.06, k.m('#ffffff', 0.5, 0, { map: t }))); },
  },
  magnifier: { label: 'Magnifier', category: 'research', build(tr) { const k = new Kit(tr); const lens = new Mesh(tr.add(new CylinderGeometry(0.27, 0.27, 0.02, 32)), tr.add(new MeshPhysicalMaterial({ color: '#cfe8ff', roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }))); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.2, 0); const rim = k.tor(0.28, 0.035, k.m('#2d3140', 0.3, 0.7), 0, 0.2, 0); const h = k.cyl(0.04, 0.05, 0.5, k.m('#8a5a3a', 0.6), 0, -0.28, 0); h.rotation.z = 0; return grp(lens, rim, h); } },
  hammer: { label: 'Hammer', category: 'ship', build(tr) { const k = new Kit(tr); const h = k.cyl(0.04, 0.04, 0.8, k.m('#8a5a3a', 0.6), 0, -0.1, 0); return grp(h, k.box(0.4, 0.2, 0.2, k.m('#8e95a6', 0.3, 0.9), 0, 0.32, 0)); } },
  energyHammer: {
    label: 'Energy hammer', category: 'badge', glows: true,
    build(tr) { const k = new Kit(tr); return grp(k.cyl(0.035, 0.035, 0.82, k.m('#2f3340', 0.3, 0.8), 0, -0.1, 0), k.box(0.46, 0.24, 0.24, k.m('#4a5066', 0.25, 0.9), 0, 0.32, 0), k.box(0.48, 0.05, 0.26, k.glow('#4fd8ff', 3), 0, 0.32, 0), k.box(0.05, 0.26, 0.26, k.glow('#4fd8ff', 3), 0.2, 0.32, 0), k.box(0.05, 0.26, 0.26, k.glow('#4fd8ff', 3), -0.2, 0.32, 0)); },
  },
  rocket: {
    label: 'Rocket', category: 'ship', glows: true,
    build(tr) {
      const k = new Kit(tr), g = new Group(), w = k.m('#f4f6fa', 0.35), r = k.m('#e8503f', 0.4);
      const body = k.mesh(new CapsuleGeometry(0.17, 0.5, 8, 20), w); const nose = k.mesh(new ConeGeometry(0.17, 0.3, 20), r, 0, 0.5, 0); const win = k.sph(0.07, k.m('#58b8ff', 0.1, 0.1), 0, 0.15, 0.15);
      g.add(body, nose, win);
      for (let i = 0; i < 3; i++) { const f = k.box(0.04, 0.26, 0.22, r, 0, -0.3, 0); const p = new Group(); p.rotation.y = (i * Math.PI * 2) / 3; f.position.set(0, -0.3, 0.2); p.add(f); g.add(p); }
      const flame = k.mesh(new ConeGeometry(0.1, 0.34, 14), k.glow('#ffb347', 3), 0, -0.62, 0); flame.rotation.x = Math.PI; g.add(flame);
      return g;
    },
  },
  wrench: { label: 'Wrench', category: 'dev', build(tr) { const k = new Kit(tr), s = k.m('#b8bfce', 0.3, 0.9); const head = k.tor(0.17, 0.06, s, 0, 0.3, 0, Math.PI * 1.55); head.rotation.z = Math.PI * 0.72; return grp(head, k.box(0.1, 0.62, 0.06, s, 0, -0.08, 0)); } },
  controller: { label: 'Controller', category: 'play', build(tr) { const k = new Kit(tr), b = k.m('#3a3f52', 0.5); return grp(k.mesh(new CapsuleGeometry(0.17, 0.5, 8, 16), b).rotateZ(Math.PI / 2) as Mesh, k.cyl(0.05, 0.05, 0.04, k.m('#15171d'), -0.22, 0.04, 0.17).rotateX(Math.PI / 2) as Mesh, k.sph(0.03, k.glow('#ff5f6a', 1), 0.24, 0.07, 0.17), k.sph(0.03, k.glow('#5fe0ff', 1), 0.3, 0.0, 0.17), k.box(0.12, 0.035, 0.035, k.m('#15171d'), 0.22, -0.03, 0.17)); } },
  camera: { label: 'Camera', category: 'create', build(tr) { const k = new Kit(tr); const lens = k.cyl(0.17, 0.17, 0.12, k.m('#1c1e24', 0.3, 0.5), 0, 0, 0.14); lens.rotation.x = Math.PI / 2; return grp(k.box(0.78, 0.5, 0.26, k.m('#d7d9e0', 0.4, 0.6)), k.box(0.78, 0.14, 0.27, k.m('#2a2d35', 0.6), 0, 0.12, 0), lens, k.sph(0.1, k.m('#5a7bd6', 0.1, 0.3), 0, 0, 0.21), k.box(0.2, 0.08, 0.1, k.m('#2a2d35'), -0.2, 0.3, 0)); } },
  microphone: { label: 'Microphone', category: 'create', build(tr) { const k = new Kit(tr); return grp(k.sph(0.2, k.m('#9aa1b0', 0.35, 0.7), 0, 0.3, 0), k.tor(0.2, 0.012, k.m('#2a2d35'), 0, 0.3, 0), k.cyl(0.06, 0.08, 0.6, k.m('#2a2d35', 0.4, 0.5), 0, -0.15, 0)); } },
  coffee: { label: 'Coffee', category: 'office', build(tr) { const k = new Kit(tr); return grp(k.cyl(0.24, 0.19, 0.4, k.m('#f4efe6', 0.4), 0, 0, 0), k.tor(0.12, 0.035, k.m('#f4efe6', 0.4), 0.27, 0, 0), k.cyl(0.21, 0.21, 0.01, k.m('#5a3a28', 0.3), 0, 0.19, 0)); } },
  headphones: { label: 'Headphones', category: 'create', build(tr) { const k = new Kit(tr), d = k.m('#2d3140', 0.4); return grp(k.tor(0.34, 0.04, d, 0, 0, 0, Math.PI), k.cyl(0.14, 0.14, 0.12, k.m('#e8503f', 0.4), -0.34, 0, 0).rotateZ(Math.PI / 2) as Mesh, k.cyl(0.14, 0.14, 0.12, k.m('#e8503f', 0.4), 0.34, 0, 0).rotateZ(Math.PI / 2) as Mesh); } },
  package: { label: 'Package', category: 'ship', build(tr) { const k = new Kit(tr); return grp(k.box(0.6, 0.5, 0.5, k.m('#c9a074', 0.8)), k.box(0.12, 0.51, 0.51, k.m('#e8d7b8', 0.6))); } },
  bolt: { label: 'Bolt', category: 'badge', build(tr) { const k = new Kit(tr); return grp(k.extrude(bolt(), 0.08, k.m('#ffd24a', 0.3, 0.4))); } },
  reactor: {
    label: 'Arc reactor', category: 'badge', glows: true,
    build(tr) { const k = new Kit(tr); const plate = k.extrude(hex(0.46), 0.06, k.m('#2c3040', 0.3, 0.9)); const ring = k.tor(0.3, 0.035, k.glow('#59e6ff', 3)); ring.position.z = 0.06; const core = k.cyl(0.18, 0.18, 0.03, k.glow('#bff6ff', 3.5), 0, 0, 0.06); core.rotation.x = Math.PI / 2; return grp(plate, ring, core); },
  },
  emblem: {
    label: 'Hero emblem', category: 'badge', glows: true,
    build(tr) { const k = new Kit(tr); const s = k.extrude(shield(), 0.06, k.m('#c93a3a', 0.3, 0.6)); const inner = k.extrude(shield(), 0.03, k.m('#e8c36a', 0.3, 0.9)); inner.scale.setScalar(0.72); inner.position.z = 0.05; const star2 = k.extrude(star(), 0.02, k.glow('#fff1a8', 1.6)); star2.scale.setScalar(0.5); star2.position.z = 0.09; return grp(s, inner, star2); },
  },
  star: { label: 'Star', category: 'badge', build(tr) { const k = new Kit(tr); return grp(k.extrude(star(), 0.08, k.m('#ffd24a', 0.3, 0.5))); } },
  planet: { label: 'Planet', category: 'play', build(tr) { const k = new Kit(tr); const ring = k.tor(0.42, 0.03, k.m('#e7c9a0', 0.5)); ring.rotation.x = 1.2; ring.rotation.y = 0.3; return grp(k.sph(0.26, k.m('#d9824a', 0.7)), ring); } },
  medal: { label: 'Medal', category: 'badge', build(tr) { const k = new Kit(tr); const disc = k.cyl(0.24, 0.24, 0.05, k.m('#e8c36a', 0.25, 1), 0, -0.1, 0); disc.rotation.x = Math.PI / 2; return grp(disc, k.sph(0.08, k.m('#c9a23f', 0.3, 1), 0, -0.1, 0.04), k.box(0.12, 0.34, 0.02, k.m('#3b5bdb', 0.6), -0.07, 0.25, 0).rotateZ(0.3) as Mesh, k.box(0.12, 0.34, 0.02, k.m('#e8503f', 0.6), 0.07, 0.25, 0).rotateZ(-0.3) as Mesh); } },
  heart: { label: 'Heart', category: 'badge', build(tr) { const k = new Kit(tr); return grp(k.extrude(heart(), 0.1, k.m('#ff5f8a', 0.35, 0.1))); } },
  notebook: { label: 'Notebook', category: 'write', build(tr) { const k = new Kit(tr); return grp(k.box(0.7, 0.9, 0.08, k.m('#3b5bdb', 0.7)), k.box(0.66, 0.86, 0.06, k.m('#fbfaf6', 0.8), 0.02, 0, 0.005), k.box(0.04, 0.9, 0.085, k.m('#1f2e7a', 0.6), 0.3, 0, 0)); } },
  pen: { label: 'Pen', category: 'write', build(tr) { const k = new Kit(tr); const body = k.cyl(0.03, 0.03, 0.6, k.m('#2d3140', 0.3, 0.5)); const tip = k.mesh(new ConeGeometry(0.03, 0.12, 12), k.m('#d9b25a', 0.3, 0.9), 0, -0.36, 0); tip.rotation.x = Math.PI; return grp(body, tip); } },
  envelope: {
    label: 'Envelope', category: 'office',
    build(tr) {
      const k = new Kit(tr), g = new Group(), w = k.m('#fbfaf6', 0.7); g.add(k.box(0.8, 0.54, 0.03, w));
      const flap = new Shape(); flap.moveTo(-0.4, 0.27); flap.lineTo(0.4, 0.27); flap.lineTo(0, -0.05); flap.closePath();
      const f = new Mesh(tr.add(new ExtrudeGeometry(flap, { depth: 0.005, bevelEnabled: false })), k.m('#e8e3d6', 0.7)); f.position.z = 0.018; g.add(f);
      g.add(k.sph(0.045, k.m('#e8503f', 0.4), 0, -0.04, 0.03)); return g;
    },
  },
  book: { label: 'Book', category: 'research', build(tr) { const k = new Kit(tr); return grp(k.box(0.62, 0.84, 0.16, k.m('#8a4fd0', 0.7)), k.box(0.58, 0.8, 0.13, k.m('#fbfaf6', 0.8), 0.02, 0, 0), k.box(0.04, 0.84, 0.165, k.m('#5d2f9a', 0.6), -0.29, 0, 0)); } },
  lock: { label: 'Lock', category: 'security', build(tr) { const k = new Kit(tr); return grp(k.box(0.5, 0.4, 0.2, k.m('#e8c36a', 0.3, 0.9), 0, -0.12, 0), k.tor(0.17, 0.04, k.m('#b8bfce', 0.3, 0.9), 0, 0.12, 0, Math.PI), k.sph(0.04, k.m('#2a2d35'), 0, -0.1, 0.11)); } },
  shield: { label: 'Shield', category: 'security', build(tr) { const k = new Kit(tr); const s = k.extrude(shield(), 0.08, k.m('#3b5bdb', 0.3, 0.5)); const c = k.cyl(0.11, 0.11, 0.03, k.glow('#9fe8ff', 1.4), 0, 0.02, 0.07); c.rotation.x = Math.PI / 2; return grp(s, c); } },
  palette: { label: 'Palette', category: 'create', build(tr) { const k = new Kit(tr); const g = new Group(); g.add(k.cyl(0.4, 0.4, 0.05, k.m('#e9d3a6', 0.6)).rotateX(Math.PI / 2) as Mesh); ['#e8503f', '#ffd24a', '#3bb273', '#3b7bdb', '#8a4fd0'].forEach((c, i) => { const a = 0.6 + i * 0.7; g.add(k.sph(0.065, k.m(c, 0.4), Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.04)); }); return g; } },
  chart: { label: 'Chart', category: 'office', build(tr) { const k = new Kit(tr), g = new Group(); g.add(k.box(0.8, 0.05, 0.4, k.m('#f4f6fa', 0.6), 0, -0.3, 0)); [0.25, 0.42, 0.34, 0.6].forEach((h, i) => g.add(k.box(0.1, h, 0.12, k.m(['#3b5bdb', '#2f9e62', '#ffb347', '#e8503f'][i], 0.4), -0.28 + i * 0.19, -0.27 + h / 2, 0))); return g; } },
  branch: { label: 'Branch', category: 'dev', build(tr) { const k = new Kit(tr), g = new Group(), t = k.m('#5dffa0', 0.3), l = k.m('#d7dbe3', 0.4); g.add(k.cyl(0.025, 0.025, 0.6, l, -0.12, 0, 0), k.cyl(0.025, 0.025, 0.34, l, 0.1, 0.14, 0).rotateZ(-0.7) as Mesh); for (const [x, y] of [[-0.12, -0.3], [-0.12, 0.3], [0.2, 0.3]]) g.add(k.sph(0.075, t, x, y, 0)); return g; } },
  gear: { label: 'Gear', category: 'ship', build(tr) { const k = new Kit(tr), g = new Group(), m = k.m('#aab2c4', 0.3, 0.9); const body = k.cyl(0.3, 0.3, 0.12, m); body.rotation.x = Math.PI / 2; g.add(body); for (let i = 0; i < 8; i++) { const t = k.box(0.12, 0.14, 0.12, m, Math.cos((i * Math.PI) / 4) * 0.34, Math.sin((i * Math.PI) / 4) * 0.34, 0); t.rotation.z = (i * Math.PI) / 4; g.add(t); } g.add(k.cyl(0.1, 0.1, 0.14, k.m('#2a2d35')).rotateX(Math.PI / 2) as Mesh); return g; } },
  keyring: { label: 'Key', category: 'security', build(tr) { const k = new Kit(tr), g = k.m('#e8c36a', 0.3, 0.9); return grp(k.tor(0.13, 0.04, g, 0, 0.25, 0), k.cyl(0.035, 0.035, 0.6, g, 0, -0.12, 0), k.box(0.12, 0.05, 0.04, g, 0.07, -0.3, 0), k.box(0.09, 0.05, 0.04, g, 0.06, -0.2, 0)); } },
  mark: {
    label: 'Platform mark', category: 'badge', glows: true,
    build(tr) { const k = new Kit(tr), g = new Group(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 3; g.add(k.sph(0.17 - i * 0.02, k.m(i === 0 ? '#17161a' : i === 1 ? '#3a3640' : '#e6dfd2', 0.5), Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0)); } return g; },
  },
};
void RepeatWrapping; void DoubleSide; void Vector3;

export const MODELS: Record<string, ModelDef> = Object.fromEntries(Object.entries(defs).map(([id, d]) => [id, { id, ...d }]));
export const MODEL_IDS = Object.keys(MODELS);
