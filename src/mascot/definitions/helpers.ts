import type { PartDef, Vec3 } from '../types';

/** Mirrors a left-side part definition to the right side (x flips, y/z rotation flips). */
export function mirror(p: PartDef, id: string, role?: PartDef['role']): PartDef {
  const pos = p.position ?? [0, 0, 0];
  const rot = p.rotation ?? [0, 0, 0];
  return { ...p, id, role, position: [-pos[0], pos[1], pos[2]], rotation: [rot[0], -rot[1], -rot[2]] };
}

export interface FaceSpec {
  parent: string;
  eyeAt: Vec3; eyeSize: Vec3; irisSize: Vec3;
  mouthAt: Vec3; mouthRadius: number;
  cheekAt?: Vec3; cheekSize?: Vec3;
  browAt?: Vec3;
  /** Eye whites make the eye read as larger and friendlier; off for solid-bead eyes. */
  sclera?: boolean;
}

/**
 * Eyes (sclera → iris → pupil → two highlights), mouth, cheeks and brows for any head part.
 * Iris/pupil/shine carry roles so the face parameters (size, spacing, squint) can drive them.
 */
export function face(s: FaceSpec): PartDef[] {
  const out: PartDef[] = [];
  const [ex, ey, ez] = s.eyeAt;
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    out.push({
      id: `eye${side}`, parent: s.parent, role: side === 'L' ? 'eyeL' : 'eyeR', shape: 'sphere', size: [1],
      stretch: s.eyeSize, position: [sx * ex, ey, ez], finish: s.sclera ? 'sclera' : 'eye', color: s.sclera ? '#f6f1ea' : '#15110f', hit: true,
    });
    out.push({
      id: `iris${side}`, parent: `eye${side}`, role: side === 'L' ? 'irisL' : 'irisR', shape: 'sphere', size: [1], stretch: s.irisSize,
      position: [0, -0.005, s.eyeSize[2] * 0.5], finish: 'iris', slot: side === 'L' ? 'eye' : 'eye2',
    });
    out.push({
      id: `pupil${side}`, parent: `iris${side}`, role: side === 'L' ? 'pupilL' : 'pupilR', shape: 'sphere', size: [1],
      stretch: [s.irisSize[0] * 0.58, s.irisSize[1] * 0.58, s.irisSize[2] * 0.7], position: [0, 0, s.irisSize[2] * 0.35], finish: 'eye', color: '#0a0807',
    });
    out.push({
      id: `shine${side}`, parent: `eye${side}`, role: side === 'L' ? 'shineL' : 'shineR', shape: 'sphere', size: [1],
      position: [0.34 * s.eyeSize[0], 0.4 * s.eyeSize[1], s.eyeSize[2] * 0.92], stretch: [s.eyeSize[0] * 0.24, s.eyeSize[0] * 0.25, s.eyeSize[0] * 0.1], finish: 'highlight',
    });
  }
  out.push({
    id: 'mouth', parent: s.parent, role: 'mouth', shape: 'smile', size: [s.mouthRadius, 0.0085],
    position: s.mouthAt, finish: 'inner', color: '#3a2024',
  });
  out.push({
    id: 'mouthOpen', parent: s.parent, role: 'mouthOpen', shape: 'sphere', size: [1],
    stretch: [s.mouthRadius * 0.62, s.mouthRadius * 0.55, 0.012],
    position: [s.mouthAt[0], s.mouthAt[1] - s.mouthRadius * 0.55, s.mouthAt[2] - 0.004], finish: 'inner', color: '#3a1519',
  });
  if (s.cheekAt && s.cheekSize) {
    const [cx, cy, cz] = s.cheekAt;
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      out.push({
        id: `cheek${side}`, parent: s.parent, role: side === 'L' ? 'cheekL' : 'cheekR', shape: 'sphere', size: [1], stretch: s.cheekSize,
        position: [sx * cx, cy, cz], rotation: [0, sx * 0.75, 0], finish: 'blush', slot: 'cheek',
      });
    }
  }
  if (s.browAt) {
    const [bx, by, bz] = s.browAt;
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      out.push({
        id: `brow${side}`, parent: s.parent, role: side === 'L' ? 'browL' : 'browR', shape: 'capsule', size: [0.014, 0.075], axis: 'x',
        position: [sx * bx, by, bz], finish: 'matte', slot: 'brow',
      });
    }
  }
  return out;
}
