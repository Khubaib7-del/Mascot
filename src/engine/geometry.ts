import { BufferGeometry, CapsuleGeometry, ConeGeometry, SphereGeometry, TorusGeometry } from 'three';
import type { PartDef } from '../mascot/types';

/**
 * Builds a part's geometry with its non-uniform stretch baked in. Normals are transformed with the
 * inverse scale rather than recomputed, so UV seams don't show up in lighting and fur shells extrude
 * along correct normals.
 */
export function buildGeometry(p: PartDef, seg: [number, number]): BufferGeometry {
  const [a = 1, b = 1] = p.size;
  let g: BufferGeometry;
  switch (p.shape) {
    case 'sphere': g = new SphereGeometry(a, seg[0], seg[1]); break;
    case 'dome': g = new SphereGeometry(a, seg[0], seg[1], 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'capsule':
      g = new CapsuleGeometry(a, b, 8, Math.max(12, Math.round(seg[0] / 2)));
      if (p.axis === 'x') g.rotateZ(Math.PI / 2);
      break;
    case 'cone': g = new ConeGeometry(a, b, Math.max(16, Math.round(seg[0] / 2))); break;
    case 'ring': g = new TorusGeometry(a, b, 16, Math.max(32, seg[0])); break;
    case 'smile': g = new TorusGeometry(a, b, 8, 28, Math.PI); g.rotateZ(Math.PI); break;
  }
  if (p.stretch) applyStretch(g, p.stretch);
  return g;
}

function applyStretch(g: BufferGeometry, s: [number, number, number]) {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) * s[0], pos.getY(i) * s[1], pos.getZ(i) * s[2]);
    const nx = nor.getX(i) / s[0], ny = nor.getY(i) / s[1], nz = nor.getZ(i) / s[2];
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(i, nx / l, ny / l, nz / l);
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
  g.computeBoundingSphere(); g.computeBoundingBox();
}
