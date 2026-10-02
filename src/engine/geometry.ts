import { BufferGeometry, CapsuleGeometry, CatmullRomCurve3, CircleGeometry, ConeGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import { buildBlobGeometry } from './blob';
import type { PartDef } from '../mascot/types';

/**
 * Builds a part's geometry with its non-uniform stretch baked in. Normals are transformed with the
 * inverse scale rather than recomputed, so UV seams don't show up in lighting and fur shells extrude
 * along correct normals.
 */
export function buildGeometry(p: PartDef, seg: [number, number], detail = 1): BufferGeometry {
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
    case 'blob': g = buildBlobGeometry(p.blob!, (p.blob!.cell ?? 0.03) / Math.max(0.5, detail)); break;
    case 'disc': g = new CircleGeometry(a, 40); break;
    case 'arc': { const arc = p.size[2] ?? 1.6; g = new TorusGeometry(a, b, 8, 24, arc); g.rotateZ(Math.PI / 2 - arc / 2); break; }
    case 'cap': {
      // Spherical cap with planar UVs (for iris textures): pole faces +z, `a` = half-angle of the cap.
      g = new SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, a); g.rotateX(Math.PI / 2);
      const pos = g.getAttribute('position'), uv: number[] = [], r = Math.sin(a);
      for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) / r) * 0.5 + 0.5, (pos.getY(i) / r) * 0.5 + 0.5);
      g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      break;
    }
    case 'wmouth': {
      // The "w" smile of a cat/bear: two soft arcs meeting under the nose, corners lifting.
      const pts: Vector3[] = [];
      for (let i = 0; i <= 28; i++) { const t = (i / 28) * 2 - 1, at = Math.abs(t); pts.push(new Vector3(t * a, a * (-0.62 * Math.sin(Math.PI * Math.pow(at, 0.85)) + 0.34 * at * at * at), 0)); }
      g = new TubeGeometry(new CatmullRomCurve3(pts), 40, b, 8);
      break;
    }
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
