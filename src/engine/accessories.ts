import {
  BoxGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry,
  TorusGeometry, type Object3D,
} from 'three';
import type { AttachPoint } from '../mascot/types';
import { canvasTex, rng, Tracker } from './worlds/common';

/** Colour slots that belong to outfit pieces. They are merged into every mascot's palette. */
export const ACCESSORY_COLORS: Record<string, string> = {
  scarf: '#7fa6e0', pack: '#e9a24a', frame: '#2a2d35', cap: '#d46a5a', phones: '#2d3140', badge: '#e8c36a', bow: '#e8503f',
};
export const ACCESSORY_COLOR_LABELS: Record<string, string> = {
  scarf: 'Scarf', pack: 'Backpack', frame: 'Glasses', cap: 'Cap', phones: 'Headphones', badge: 'Badge', bow: 'Bow tie',
};

export interface SwingDef {
  pivot: Object3D;
  /** Attach point whose world motion drives this swing. */
  ref: AttachPoint;
  gain: number;
  stiffness: number;
  damping: number;
  max: number;
  mode: 'rot' | 'bounce';
  /** Lag factor so chained segments ripple instead of moving as one. */
  lag?: number;
}

export interface AccessoryRig {
  /** One group per attach point; the instance positions it using the mascot's AttachDef. */
  nodes: Partial<Record<AttachPoint, Object3D>>;
  swings: SwingDef[];
  setColor(slot: string, color: Color): void;
}

export interface AccessoryDef {
  id: string;
  label: string;
  group: 'Neck' | 'Head' | 'Face' | 'Back' | 'Body';
  /** Every listed point must exist on the mascot, otherwise the item is hidden for it. */
  attach: AttachPoint[];
  colors: string[];
  build(tr: Tracker): AccessoryRig;
}

class Slots {
  private by = new Map<string, MeshStandardMaterial[]>();
  constructor(private tr: Tracker) {}
  mat(slot: string, rough = 0.8, extra: Partial<MeshStandardMaterial> = {}) {
    const m = this.tr.add(new MeshStandardMaterial({ color: ACCESSORY_COLORS[slot] ?? '#fff', roughness: rough, ...extra }));
    (this.by.get(slot) ?? this.by.set(slot, []).get(slot)!).push(m);
    return m;
  }
  set(slot: string, c: Color) { this.by.get(slot)?.forEach((m) => m.color.copy(c)); }
}

const mesh = (tr: Tracker, geo: Mesh['geometry'], mat: MeshStandardMaterial | MeshPhysicalMaterial, x = 0, y = 0, z = 0) => {
  const m = new Mesh(tr.add(geo), mat); m.position.set(x, y, z); m.castShadow = true; return m;
};

function knitTexture(tr: Tracker) {
  const t = canvasTex(64, 64, (c) => {
    c.fillStyle = '#e8e8e8'; c.fillRect(0, 0, 64, 64); const r = rng(5);
    for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) { c.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.08})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 4); c.lineTo(x + 4, y); c.lineTo(x + 3, y); c.lineTo(x + 2, y + 2.4); c.lineTo(x + 1, y); c.fill(); }
  }, tr);
  t.wrapS = t.wrapT = 1000; t.repeat.set(4, 2);
  return t;
}

const rig = (nodes: AccessoryRig['nodes'], swings: SwingDef[], slots: Slots): AccessoryRig => ({ nodes, swings, setColor: (s, c) => slots.set(s, c) });

export const ACCESSORIES: Record<string, AccessoryDef> = {
  scarf: {
    id: 'scarf', label: 'Knit scarf', group: 'Neck', attach: ['neck'], colors: ['scarf'],
    build(tr) {
      const s = new Slots(tr), knit = knitTexture(tr);
      const mat = s.mat('scarf', 1, { map: knit, bumpMap: knit, bumpScale: 1.2 });
      const g = new Group();
      const ring = mesh(tr, new TorusGeometry(1, 0.3, 14, 40), mat); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1, 0.82); g.add(ring);
      const knot = mesh(tr, new SphereGeometry(0.34, 16, 12), mat, 0.55, -0.12, 0.86); knot.scale.set(1, 1.1, 0.85); g.add(knot);
      const swings: SwingDef[] = [];
      let parent: Group = g, y = -0.1;
      for (let i = 0; i < 3; i++) {
        const piv = new Group(); piv.position.set(i === 0 ? 0.55 : 0, i === 0 ? y : -0.5, i === 0 ? 0.92 : 0.0); parent.add(piv);
        const seg = mesh(tr, new BoxGeometry(0.36, 0.52, 0.09), mat, 0, -0.25, 0); piv.add(seg);
        if (i === 2) piv.add(mesh(tr, new BoxGeometry(0.36, 0.06, 0.1), s.mat('scarf', 1), 0, -0.55, 0));
        swings.push({ pivot: piv, ref: 'neck', gain: 0.9 + i * 0.5, stiffness: 36 - i * 6, damping: 3.2, max: 0.9, mode: 'rot', lag: i });
        parent = piv;
      }
      return rig({ neck: g }, swings, s);
    },
  },
  bow: {
    id: 'bow', label: 'Bow tie', group: 'Neck', attach: ['neck'], colors: ['bow'],
    build(tr) {
      const s = new Slots(tr), m = s.mat('bow', 0.6), g = new Group();
      for (const x of [-1, 1]) { const w = mesh(tr, new SphereGeometry(0.32, 14, 10), m, x * 0.34, -0.1, 1.0); w.scale.set(1.1, 0.8, 0.45); g.add(w); }
      g.add(mesh(tr, new SphereGeometry(0.14, 12, 10), m, 0, -0.1, 1.04));
      return rig({ neck: g }, [], s);
    },
  },
  glasses: {
    id: 'glasses', label: 'Round glasses', group: 'Face', attach: ['face'], colors: ['frame'],
    build(tr) {
      const s = new Slots(tr), fm = s.mat('frame', 0.3, { metalness: 0.6 }), g = new Group();
      const lens = tr.add(new MeshPhysicalMaterial({ color: '#dff0ff', roughness: 0.05, transparent: true, opacity: 0.16, clearcoat: 1, side: DoubleSide }));
      for (const x of [-1, 1]) {
        const r = mesh(tr, new TorusGeometry(0.62, 0.06, 12, 36), fm, x, 0, 0); g.add(r);
        const l = new Mesh(tr.add(new PlaneGeometry(1.2, 1.2)), lens); l.position.set(x, 0, 0); g.add(l);
        const t = mesh(tr, new CylinderGeometry(0.035, 0.035, 2.6, 6), fm, x * 1.62, 0, -1.3); t.rotation.x = Math.PI / 2; g.add(t);
      }
      const bridge = mesh(tr, new TorusGeometry(0.3, 0.05, 8, 16, Math.PI), fm, 0, 0.12, 0); g.add(bridge);
      return rig({ face: g }, [], s);
    },
  },
  headphones: {
    id: 'headphones', label: 'Headphones', group: 'Head', attach: ['head'], colors: ['phones'],
    build(tr) {
      const s = new Slots(tr), m = s.mat('phones', 0.4, { metalness: 0.2 }), pad = tr.add(new MeshStandardMaterial({ color: '#e8503f', roughness: 0.7 })), g = new Group();
      g.add(mesh(tr, new TorusGeometry(1.0, 0.06, 10, 40, Math.PI), m));
      for (const x of [-1, 1]) {
        const cup = mesh(tr, new CylinderGeometry(0.27, 0.27, 0.2, 28), m, x * 1.02, 0, 0); cup.rotation.z = Math.PI / 2; g.add(cup);
        const cush = mesh(tr, new CylinderGeometry(0.23, 0.23, 0.1, 28), pad, x * 0.92, 0, 0); cush.rotation.z = Math.PI / 2; g.add(cush);
      }
      return rig({ head: g }, [], s);
    },
  },
  cap: {
    id: 'cap', label: 'Little cap', group: 'Head', attach: ['head'], colors: ['cap'],
    build(tr) {
      const s = new Slots(tr), knit = knitTexture(tr), m = s.mat('cap', 1, { map: knit, bumpMap: knit, bumpScale: 1 }), g = new Group();
      const dome = mesh(tr, new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, 0.85, 1); g.add(dome);
      const fold = mesh(tr, new TorusGeometry(0.98, 0.14, 12, 36), m); fold.rotation.x = Math.PI / 2; g.add(fold);
      const piv = new Group(); piv.position.set(0, 0.84, 0); g.add(piv);
      piv.add(mesh(tr, new SphereGeometry(0.2, 14, 10), s.mat('cap', 1), 0, 0.12, 0));
      return rig({ head: g }, [{ pivot: piv, ref: 'head', gain: 1.4, stiffness: 40, damping: 3, max: 0.7, mode: 'rot' }], s);
    },
  },
  backpack: {
    id: 'backpack', label: 'Backpack', group: 'Back', attach: ['back'], colors: ['pack'],
    build(tr) {
      const s = new Slots(tr), m = s.mat('pack', 0.8), dark = tr.add(new MeshStandardMaterial({ color: '#3a2c20', roughness: 0.7 })), g = new Group();
      const piv = new Group(); g.add(piv);
      const body = mesh(tr, new SphereGeometry(1, 24, 16), m, 0, -0.1, -0.55); body.scale.set(0.95, 1.05, 0.62); piv.add(body);
      const flap = mesh(tr, new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), s.mat('pack', 0.75), 0, 0.28, -0.52); flap.scale.set(0.98, 0.62, 0.66); piv.add(flap);
      const pocket = mesh(tr, new SphereGeometry(1, 18, 12), s.mat('pack', 0.8), 0, -0.45, -1.0); pocket.scale.set(0.55, 0.38, 0.22); piv.add(pocket);
      piv.add(mesh(tr, new CylinderGeometry(0.06, 0.06, 0.22, 10), dark, 0, 0.05, -1.08));
      for (const x of [-1, 1]) { const strap = mesh(tr, new BoxGeometry(0.16, 1.6, 0.08), dark, x * 0.62, 0.0, -0.1); strap.rotation.z = x * 0.05; piv.add(strap); }
      return rig({ back: g }, [{ pivot: piv, ref: 'back', gain: 0.5, stiffness: 55, damping: 5, max: 0.18, mode: 'bounce' }], s);
    },
  },
  badge: {
    id: 'badge', label: 'Agent badge', group: 'Body', attach: ['chest'], colors: ['badge'],
    build(tr) {
      const s = new Slots(tr), m = s.mat('badge', 0.25, { metalness: 0.85 }), g = new Group(), piv = new Group(); g.add(piv);
      const disc = mesh(tr, new CylinderGeometry(1, 1, 0.14, 40), m); disc.rotation.x = Math.PI / 2; piv.add(disc);
      const ring = mesh(tr, new TorusGeometry(0.86, 0.05, 8, 40), m, 0, 0, 0.08); piv.add(ring);
      const dots = ['#17161a', '#3a3640', '#f3efe8'];
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * Math.PI * 2) / 3; piv.add(mesh(tr, new SphereGeometry(0.2 - i * 0.02, 14, 10), tr.add(new MeshStandardMaterial({ color: dots[i], roughness: 0.5 })), Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.1)); }
      return rig({ chest: g }, [{ pivot: piv, ref: 'chest', gain: 0.5, stiffness: 50, damping: 5, max: 0.25, mode: 'rot' }], s);
    },
  },
  watch: {
    id: 'watch', label: 'Smart watch', group: 'Body', attach: ['handL'], colors: ['frame'],
    build(tr) {
      const s = new Slots(tr), g = new Group(), strap = s.mat('frame', 0.6);
      const band = mesh(tr, new TorusGeometry(1, 0.2, 10, 30), strap); band.rotation.x = Math.PI / 2; g.add(band);
      g.add(mesh(tr, new BoxGeometry(0.9, 0.2, 0.9), tr.add(new MeshStandardMaterial({ color: '#c9ccd4', roughness: 0.3, metalness: 0.8 })), 0, 0, 1.02));
      g.add(mesh(tr, new BoxGeometry(0.74, 0.04, 0.74), tr.add(new MeshStandardMaterial({ color: '#000', emissive: new Color('#59e6ff'), emissiveIntensity: 1.6 })), 0, 0.12, 1.02));
      return rig({ handL: g }, [], s);
    },
  },
};

export const ACCESSORY_IDS = Object.keys(ACCESSORIES);
void Color;
