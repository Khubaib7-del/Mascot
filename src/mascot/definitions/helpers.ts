import type { PartDef, Vec3 } from '../types';

/** Mirrors a left-side part definition to the right side (x flips, y/z rotation flips). */
export function mirror(p: PartDef, id: string, role?: PartDef['role']): PartDef {
  const pos = p.position ?? [0, 0, 0];
  const rot = p.rotation ?? [0, 0, 0];
  return { ...p, id, role, position: [-pos[0], pos[1], pos[2]], rotation: [rot[0], -rot[1], -rot[2]] };
}

export interface FaceSpec {
  parent: string;
  eyeAt: Vec3; eyeSize: Vec3; irisSize: Vec3; irisSlot?: string;
  mouthAt: Vec3; mouthRadius: number;
  cheekAt?: Vec3; cheekSize?: Vec3;
  browAt?: Vec3;
}

/** Eyes (with iris + fixed highlight), mouth and optional cheeks/brows for any head part. */
export function face(s: FaceSpec): PartDef[] {
  const out: PartDef[] = [];
  const [ex, ey, ez] = s.eyeAt;
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    out.push({
      id: `eye${side}`, parent: s.parent, role: side === 'L' ? 'eyeL' : 'eyeR', shape: 'sphere', size: [1],
      stretch: s.eyeSize, position: [sx * ex, ey, ez], finish: 'eye', color: '#0b0d13', hit: true,
    });
    out.push({
      id: `iris${side}`, parent: `eye${side}`, shape: 'sphere', size: [1], stretch: s.irisSize,
      position: [0, -0.004, s.eyeSize[2] * 0.55], finish: 'iris', slot: s.irisSlot ?? 'eye',
    });
    out.push({
      id: `shine${side}`, parent: s.parent, shape: 'sphere', size: [0.017],
      position: [sx * ex + 0.03, ey + 0.036, ez + s.eyeSize[2] * 0.85], finish: 'highlight',
    });
  }
  out.push({
    id: 'mouth', parent: s.parent, role: 'mouth', shape: 'smile', size: [s.mouthRadius, 0.0085],
    position: s.mouthAt, finish: 'inner', color: '#2a1217',
  });
  out.push({
    id: 'mouthOpen', parent: s.parent, role: 'mouthOpen', shape: 'sphere', size: [1],
    stretch: [s.mouthRadius * 0.62, s.mouthRadius * 0.55, 0.012],
    position: [s.mouthAt[0], s.mouthAt[1] - s.mouthRadius * 0.55, s.mouthAt[2] - 0.004], finish: 'inner', color: '#2a1217',
  });
  if (s.cheekAt && s.cheekSize) {
    const [cx, cy, cz] = s.cheekAt;
    out.push({
      id: 'cheekL', parent: s.parent, role: 'cheekL', shape: 'sphere', size: [1], stretch: s.cheekSize,
      position: [cx, cy, cz], rotation: [0, 0.75, 0], finish: 'matte', slot: 'cheek',
    });
    out.push({
      id: 'cheekR', parent: s.parent, role: 'cheekR', shape: 'sphere', size: [1], stretch: s.cheekSize,
      position: [-cx, cy, cz], rotation: [0, -0.75, 0], finish: 'matte', slot: 'cheek',
    });
  }
  if (s.browAt) {
    const [bx, by, bz] = s.browAt;
    out.push({
      id: 'browL', parent: s.parent, role: 'browL', shape: 'capsule', size: [0.017, 0.085], axis: 'x',
      position: [bx, by, bz], finish: 'matte', slot: 'detail',
    });
    out.push({
      id: 'browR', parent: s.parent, role: 'browR', shape: 'capsule', size: [0.017, 0.085], axis: 'x',
      position: [-bx, by, bz], finish: 'matte', slot: 'detail',
    });
  }
  return out;
}
