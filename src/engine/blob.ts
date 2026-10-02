import { BufferGeometry, Euler, Float32BufferAttribute, Matrix4, Uint32BufferAttribute } from 'three';
import type { Vec3 } from '../mascot/types';

/**
 * Organic bodies from signed-distance primitives. Ellipsoids and round cones are smooth-unioned, so a head
 * flows into its cheeks and a limb flows into its paw with no seams — closer to a sculpted toy than stacked spheres.
 * Meshing uses naive surface nets; normals are SDF gradients, so lighting and fur extrusion are perfectly smooth.
 */
export interface BlobPrim {
  t: 'e' | 'c';
  c?: Vec3; r?: Vec3; rot?: Vec3;
  a?: Vec3; b?: Vec3; r0?: number; r1?: number;
  /** Subtract instead of add (carves ear hollows, eye sockets). */
  sub?: boolean;
  /** Blend radius for this primitive; defaults to the spec's. */
  k?: number;
}
export interface BlobSpec { prims: BlobPrim[]; k: number; cell?: number }

export const E = (c: Vec3, r: Vec3, o: Partial<BlobPrim> = {}): BlobPrim => ({ t: 'e', c, r, ...o });
export const RC = (a: Vec3, b: Vec3, r0: number, r1: number, o: Partial<BlobPrim> = {}): BlobPrim => ({ t: 'c', a, b, r0, r1, ...o });

const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

type Eval = (x: number, y: number, z: number) => number;

export function blobSDF(spec: BlobSpec): Eval {
  const add: Eval[] = [], addK: number[] = [], sub: Eval[] = [], subK: number[] = [];
  for (const p of spec.prims) {
    const k = p.k ?? spec.k;
    let f: Eval;
    if (p.t === 'e') {
      const [cx, cy, cz] = p.c!, [rx, ry, rz] = p.r!;
      const rot = p.rot && (p.rot[0] || p.rot[1] || p.rot[2]) ? new Matrix4().makeRotationFromEuler(new Euler(...p.rot)).transpose().elements : null;
      f = (x, y, z) => {
        let px = x - cx, py = y - cy, pz = z - cz;
        if (rot) { const qx = rot[0] * px + rot[4] * py + rot[8] * pz, qy = rot[1] * px + rot[5] * py + rot[9] * pz, qz = rot[2] * px + rot[6] * py + rot[10] * pz; px = qx; py = qy; pz = qz; }
        const k0 = Math.hypot(px / rx, py / ry, pz / rz);
        const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
        return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
      };
    } else {
      const [ax, ay, az] = p.a!, [bx, by, bz] = p.b!, r1 = p.r0!, r2 = p.r1!;
      const bax = bx - ax, bay = by - ay, baz = bz - az;
      const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
      f = (x, y, z) => {
        const pax = x - ax, pay = y - ay, paz = z - az;
        const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
        const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
        const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
        const kk = Math.sign(rr) * rr * rr * x2;
        if (Math.sign(zz) * a2 * z2 > kk) return Math.sqrt(x2 + z2) * il2 - r2;
        if (Math.sign(yy) * a2 * y2 < kk) return Math.sqrt(x2 + y2) * il2 - r1;
        return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
      };
    }
    (p.sub ? sub : add).push(f); (p.sub ? subK : addK).push(k);
  }
  return (x, y, z) => {
    let d = add[0](x, y, z);
    for (let i = 1; i < add.length; i++) d = smin(d, add[i](x, y, z), addK[i]);
    for (let i = 0; i < sub.length; i++) d = smax(d, -sub[i](x, y, z), subK[i]);
    return d;
  };
}

function bounds(spec: BlobSpec): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [1e9, 1e9, 1e9], max: Vec3 = [-1e9, -1e9, -1e9];
  const grow = (c: Vec3, r: number) => { for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], c[i] - r); max[i] = Math.max(max[i], c[i] + r); } };
  for (const p of spec.prims) {
    if (p.sub) continue;
    if (p.t === 'e') grow(p.c!, Math.max(...p.r!)); else { grow(p.a!, Math.max(p.r0!, p.r1!)); grow(p.b!, Math.max(p.r0!, p.r1!)); }
  }
  return { min, max };
}

const cache = new Map<string, { pos: Float32Array; nor: Float32Array; idx: Uint32Array }>();

/** Builds (and caches the CPU arrays of) a blob mesh. `cell` is the grid size in model units. */
export function buildBlobGeometry(spec: BlobSpec, cell: number): BufferGeometry {
  const key = `${JSON.stringify(spec)}|${cell.toFixed(4)}`;
  let m = cache.get(key);
  if (!m) {
    const t0 = performance.now();
    m = meshSDF(blobSDF(spec), bounds(spec), spec.k, cell); cache.set(key, m);
    const g = globalThis as unknown as { __blobMs?: number; __blobN?: number };
    g.__blobMs = (g.__blobMs ?? 0) + performance.now() - t0; g.__blobN = (g.__blobN ?? 0) + 1;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(m.nor, 3));
  g.setIndex(new Uint32BufferAttribute(m.idx, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

function meshSDF(f: Eval, b: { min: Vec3; max: Vec3 }, k: number, cell: number) {
  const pad = k * 0.7 + cell * 2;
  const min = b.min.map((v) => v - pad) as Vec3;
  const nx = Math.ceil((b.max[0] + pad - min[0]) / cell), ny = Math.ceil((b.max[1] + pad - min[1]) / cell), nz = Math.ceil((b.max[2] + pad - min[2]) / cell);
  const W = nx + 1, H = ny + 1, D = nz + 1;
  const vals = new Float32Array(W * H * D);
  for (let z = 0; z < D; z++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) vals[x + W * (y + H * z)] = f(min[0] + x * cell, min[1] + y * cell, min[2] + z * cell);
  const cv = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [], nor: number[] = [];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const ED = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const eps = cell * 0.5;
  const v = new Float32Array(8);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i0 = x + W * (y + H * z), sy1 = W, sz1 = W * H;
    v[0] = vals[i0]; v[1] = vals[i0 + 1]; v[2] = vals[i0 + sy1]; v[3] = vals[i0 + sy1 + 1];
    v[4] = vals[i0 + sz1]; v[5] = vals[i0 + sz1 + 1]; v[6] = vals[i0 + sz1 + sy1]; v[7] = vals[i0 + sz1 + sy1 + 1];
    let neg = 0; for (let i = 0; i < 8; i++) if (v[i] < 0) neg++;
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, c] of ED) {
      if ((v[a] < 0) === (v[c] < 0)) continue;
      const t = v[a] / (v[a] - v[c]);
      sx += CO[a][0] + t * (CO[c][0] - CO[a][0]); sy += CO[a][1] + t * (CO[c][1] - CO[a][1]); sz += CO[a][2] + t * (CO[c][2] - CO[a][2]); n++;
    }
    let px = min[0] + (x + sx / n) * cell, py = min[1] + (y + sy / n) * cell, pz = min[2] + (z + sz / n) * cell;
    const grad = (qx: number, qy: number, qz: number): Vec3 => {
      const gx = f(qx + eps, qy, qz) - f(qx - eps, qy, qz), gy = f(qx, qy + eps, qz) - f(qx, qy - eps, qz), gz = f(qx, qy, qz + eps) - f(qx, qy, qz - eps);
      const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l];
    };
    // One Newton step onto the true surface removes the faceting of the averaged vertex.
    const g0 = grad(px, py, pz), d0 = f(px, py, pz);
    px -= g0[0] * d0; py -= g0[1] * d0; pz -= g0[2] * d0;
    const g = grad(px, py, pz);
    cv[x + nx * (y + ny * z)] = pos.length / 3;
    pos.push(px, py, pz); nor.push(g[0], g[1], g[2]);
  }
  const idx: number[] = [];
  const at = (x: number, y: number, z: number) => cv[x + nx * (y + ny * z)];
  const quad = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const dot = fx * (nor[a * 3] + nor[c * 3]) + fy * (nor[a * 3 + 1] + nor[c * 3 + 1]) + fz * (nor[a * 3 + 2] + nor[c * 3 + 2]);
    if (dot >= 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
  };
  for (let z = 0; z < D; z++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v0 = vals[x + W * (y + H * z)];
    if (x < nx && y > 0 && z > 0 && y < ny && z < nz && (v0 < 0) !== (vals[x + 1 + W * (y + H * z)] < 0)) quad(at(x, y - 1, z - 1), at(x, y, z - 1), at(x, y, z), at(x, y - 1, z));
    if (y < ny && x > 0 && z > 0 && x < nx && z < nz && (v0 < 0) !== (vals[x + W * (y + 1 + H * z)] < 0)) quad(at(x - 1, y, z - 1), at(x - 1, y, z), at(x, y, z), at(x, y, z - 1));
    if (z < nz && x > 0 && y > 0 && x < nx && y < ny && (v0 < 0) !== (vals[x + W * (y + H * (z + 1))] < 0)) quad(at(x - 1, y - 1, z), at(x, y - 1, z), at(x, y, z), at(x - 1, y, z));
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) };
}

/** Where a ray along -z at (x, y) first enters the blob (for placing eyes, noses, accessories exactly on the skin). */
export function surfaceZ(spec: BlobSpec, x: number, y: number, z0 = 2): number {
  const f = blobSDF(spec);
  let z = z0, prev = f(x, y, z);
  for (let i = 0; i < 400 && z > -2; i++) {
    z -= 0.01; const d = f(x, y, z);
    if (d < 0 && prev >= 0) { let lo = z, hi = z + 0.01; for (let j = 0; j < 24; j++) { const mid = (lo + hi) / 2; if (f(x, y, mid) < 0) lo = mid; else hi = mid; } return (lo + hi) / 2; }
    prev = d;
  }
  return 0;
}

/** Outward unit normal of the blob surface at a point. */
export function surfaceNormal(spec: BlobSpec, x: number, y: number, z: number): Vec3 {
  const f = blobSDF(spec), e = 0.004;
  const g: Vec3 = [f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)];
  const l = Math.hypot(...g) || 1; return [g[0] / l, g[1] / l, g[2] / l];
}

export function mirrorBlob(s: BlobSpec): BlobSpec {
  const mx = (v?: Vec3): Vec3 | undefined => (v ? [-v[0], v[1], v[2]] : v);
  return { ...s, prims: s.prims.map((p) => ({ ...p, c: mx(p.c), a: mx(p.a), b: mx(p.b), rot: p.rot ? [p.rot[0], -p.rot[1], -p.rot[2]] : p.rot })) };
}
