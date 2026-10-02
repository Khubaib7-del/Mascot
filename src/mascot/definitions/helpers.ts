import { mirrorBlob, surfaceNormal, surfaceZ, type BlobSpec } from '../../engine/blob';
import type { PartDef, Vec3 } from '../types';

/** Mirrors a left-side part definition to the right side (x flips, y/z rotation flips; blobs are mirrored too). */
export function mirror(p: PartDef, id: string, role?: PartDef['role']): PartDef {
  const pos = p.position ?? [0, 0, 0];
  const rot = p.rotation ?? [0, 0, 0];
  const off = p.offset;
  return {
    ...p, id, role,
    position: [-pos[0], pos[1], pos[2]], rotation: [rot[0], -rot[1], -rot[2]],
    offset: off ? [-off[0], off[1], off[2]] : off,
    blob: p.blob ? mirrorBlob(p.blob) : p.blob,
    furMask: p.furMask ? (Array.isArray(p.furMask) ? p.furMask : [p.furMask]).map((m) => ({ ...m, center: [-m.center[0], m.center[1], m.center[2]] as Vec3 })) : p.furMask,
  };
}

export interface FaceSpec {
  parent: string;
  /** The head blob: eyes, nose, mouth and cheeks are snapped onto its surface. */
  head: BlobSpec;
  eye: { x: number; y: number; w: number; h: number; iris?: number; pupil?: number; sink?: number };
  nose?: { y: number; w: number; h: number; shape?: 'bear' | 'cat' | 'alpaca' };
  mouth?: { y: number; r: number; tube?: number };
  cheek?: { x: number; y: number; r: number };
  brow?: { x: number; y: number; len: number; tube?: number };
  lashes?: boolean;
}

/**
 * Big glossy eyes built like a toy's: black eye ball, a textured iris cap (dark limbus, bright ring, lit crescent),
 * a pupil, a glass cornea that reflects the room, and two catch-lights. Roles let sliders and blinks drive each piece.
 */
export function face(s: FaceSpec): PartDef[] {
  const out: PartDef[] = [];
  const { x: ex, y: ey, w, h } = s.eye;
  const d = w * 0.64, sink = s.eye.sink ?? 0.012;
  const irisF = s.eye.iris ?? 0.86, pupilF = s.eye.pupil ?? 0.5;
  const surf = (x: number, y: number) => surfaceZ(s.head, x, y);
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const ez = surf(sx * ex, ey) - sink;
    out.push({ id: `eye${side}`, parent: s.parent, role: side === 'L' ? 'eyeL' : 'eyeR', shape: 'sphere', size: [1], stretch: [w, h, d], position: [sx * ex, ey, ez], finish: 'eye', color: '#120d0c', hit: true });
    out.push({ id: `iris${side}`, parent: `eye${side}`, role: side === 'L' ? 'irisL' : 'irisR', shape: 'cap', size: [Math.asin(irisF)], stretch: [w * 1.012, h * 1.012, d * 1.012], position: [0, -h * 0.02, 0], finish: 'iris', slot: side === 'L' ? 'eye' : 'eye2' });
    out.push({ id: `pupil${side}`, parent: `eye${side}`, role: side === 'L' ? 'pupilL' : 'pupilR', shape: 'cap', size: [Math.asin(pupilF * irisF)], stretch: [w * 1.02, h * 1.02, d * 1.02], position: [0, -h * 0.02, 0], finish: 'matte', color: '#050303' });
    out.push({ id: `cornea${side}`, parent: `eye${side}`, shape: 'sphere', size: [1], stretch: [1.05, 1.05, 1.05], finish: 'glass' });
    out.push({ id: `shine${side}`, parent: `eye${side}`, role: side === 'L' ? 'shineL' : 'shineR', shape: 'sphere', size: [1], stretch: [0.2 * w, 0.22 * w, 0.1 * w], position: [-0.3 * w, 0.36 * h, d * 0.99], finish: 'highlight' });
    out.push({ id: `shine2${side}`, parent: `eye${side}`, role: side === 'L' ? 'shineL' : 'shineR', shape: 'sphere', size: [1], stretch: [0.09 * w, 0.1 * w, 0.06 * w], position: [0.34 * w, -0.34 * h, d * 0.95], finish: 'highlight' });
    if (s.lashes) out.push({ id: `lash${side}`, parent: s.parent, shape: 'arc', size: [w * 1.12, 0.007, 2.3], stretch: [1, 0.85, 1], position: [sx * ex, ey + h * 0.2, ez + d * 0.5], rotation: [0, sx * 0.12, sx * -0.12], finish: 'matte', color: '#1e1513' });
  }
  if (s.nose) {
    const n = s.nose, z = surf(0, n.y);
    const w2 = n.shape === 'alpaca' ? 0.78 : 1;
    out.push({ id: 'nose', parent: s.parent, shape: 'sphere', size: [1], stretch: [n.w, n.h * w2, n.w * 0.7], position: [0, n.y, z - n.w * 0.12], finish: 'gloss', slot: 'nose' });
    if (n.shape !== 'alpaca') out.push({ id: 'philtrum', parent: s.parent, shape: 'capsule', size: [0.0045, n.h * 1.1], position: [0, n.y - n.h * 1.4, surf(0, n.y - n.h * 1.4) + 0.002], finish: 'inner', color: '#4a3028' });
  }
  if (s.mouth) {
    const m = s.mouth, z = surf(0, m.y) + 0.004;
    out.push({ id: 'mouth', parent: s.parent, role: 'mouth', shape: 'wmouth', size: [m.r, m.tube ?? 0.0075], position: [0, m.y, z], finish: 'inner', color: '#3a2024' });
    out.push({ id: 'mouthOpen', parent: s.parent, role: 'mouthOpen', shape: 'sphere', size: [1], stretch: [m.r * 0.6, m.r * 0.5, 0.012], position: [0, m.y - m.r * 0.5, z - 0.012], finish: 'inner', color: '#4a1a1f' });
  }
  if (s.cheek) {
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1, x = sx * s.cheek.x, y = s.cheek.y, z = surf(x, y);
      const n = surfaceNormal(s.head, x, y, z);
      out.push({ id: `cheek${side}`, parent: s.parent, role: side === 'L' ? 'cheekL' : 'cheekR', shape: 'disc', size: [1], stretch: [s.cheek.r, s.cheek.r * 0.72, 1], position: [x + n[0] * 0.004, y, z + n[2] * 0.004], rotation: [-Math.asin(n[1]), Math.atan2(n[0], n[2]), 0], finish: 'blush', slot: 'cheek' });
    }
  }
  if (s.brow) {
    const b = s.brow;
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1, x = sx * b.x, z = surf(x, b.y) + 0.004;
      out.push({ id: `brow${side}`, parent: s.parent, role: side === 'L' ? 'browL' : 'browR', shape: 'arc', size: [b.len, b.tube ?? 0.0085, 1.15], position: [x, b.y, z], rotation: [0, sx * 0.25, sx * -0.18], finish: 'matte', slot: 'brow' });
    }
  }
  return out.map((p) => ({ ...p, flat: true }));
}

/** A paw pad cluster on +z: one big pad and four toe beans, plus optional claws. */
export function pawPads(parent: string, at: Vec3, o: { slot?: string; size?: number; claws?: boolean; clawSlot?: string; id?: string; dir?: 1 | -1 } = {}): PartDef[] {
  const k = o.size ?? 1, slot = o.slot ?? 'pad', id = o.id ?? parent, dir = o.dir ?? 1;
  const [x, y, z] = at;
  const parts: PartDef[] = [{ id: `${id}Pad`, parent, shape: 'sphere', size: [1], stretch: [0.075 * k, 0.062 * k, 0.026 * k], position: [x, y, z], finish: 'pad', slot }];
  for (const [dx, dy, r] of [[-0.098, 0.082, 0.032], [-0.036, 0.122, 0.034], [0.036, 0.122, 0.034], [0.098, 0.082, 0.032]] as number[][])
    parts.push({ id: `${id}Toe${parts.length}`, parent, shape: 'sphere', size: [1], stretch: [r * k, r * 1.15 * k, 0.02 * k], position: [x + dx * k, y + dy * k * dir, z - 0.004 * k], finish: 'pad', slot });
  if (o.claws) for (const dx of [-0.08, 0, 0.08]) parts.push({ id: `${id}Claw${parts.length}`, parent, shape: 'sphere', size: [1], stretch: [0.017 * k, 0.026 * k, 0.014 * k], position: [x + dx * k, y + 0.19 * k * dir, z - 0.04 * k], finish: 'pad', slot: o.clawSlot ?? 'claw' });
  return parts;
}
