import { E, RC, mirrorBlob, surfaceZ, type BlobSpec } from '../../engine/blob';
import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

// Snow-leopard cub: big round head, slim pear body, thin legs with broad paws, arms folded at the chest,
// and a huge curled tail — all following the supplied reference.
const HEAD: BlobSpec = {
  k: 0.13,
  prims: [
    E([0, 0.36, 0], [0.5, 0.42, 0.45]),
    E([0.29, 0.2, 0.1], [0.29, 0.23, 0.3]), E([-0.29, 0.2, 0.1], [0.29, 0.23, 0.3]),
    E([0, 0.2, 0.38], [0.2, 0.14, 0.15]),
    E([0, 0.07, 0.2], [0.27, 0.13, 0.25]),
  ],
};
const BODY: BlobSpec = {
  k: 0.2,
  prims: [E([0, -0.08, 0.02], [0.4, 0.42, 0.36]), E([0, 0.26, 0], [0.31, 0.28, 0.27]), E([0, -0.3, -0.02], [0.41, 0.24, 0.34])],
};
const ARM: BlobSpec = { k: 0.07, prims: [RC([0, 0, 0], [0, -0.3, 0.02], 0.1, 0.09), E([0, -0.37, 0.04], [0.105, 0.095, 0.1])] };
const LEG: BlobSpec = { k: 0.09, prims: [RC([0, 0, 0], [0, -0.3, 0.02], 0.14, 0.125), E([0, -0.38, 0.1], [0.165, 0.085, 0.25])] };
const EAR: BlobSpec = { k: 0.05, prims: [E([0.02, 0.06, 0], [0.17, 0.17, 0.095]), E([0, 0.04, 0.095], [0.11, 0.11, 0.065], { sub: true })] };
const TAIL: BlobSpec = mirrorBlob({
  k: 0.14,
  prims: [
    RC([0, 0, 0], [-0.3, -0.1, -0.2], 0.12, 0.15), RC([-0.3, -0.1, -0.2], [-0.6, 0.22, -0.14], 0.15, 0.2),
    RC([-0.6, 0.22, -0.14], [-0.66, 0.6, -0.02], 0.2, 0.2), E([-0.66, 0.66, -0.02], [0.2, 0.2, 0.2]),
  ],
});

const SPOTS = { slot: 'marking', kind: 'spots' as const, scale: 6.5, coverage: 0.45, size: 0.5 };
const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'blob', size: [1], blob: EAR, position: [0.4, 0.6, -0.04], rotation: [0, 0, -0.45],
  finish: 'surface', slot: 'body', furry: true, hit: true, fur: { length: 0.8 }, furMask: { center: [0, 0.04, 0.09], radii: [0.12, 0.12, 0.09], fade: 0 },
  markings: { slot: 'marking', kind: 'patches', scale: 1.2, coverage: 1, size: 0.5 },
};
const arm: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'blob', size: [1], blob: ARM, position: [0.34, 0.36, 0.03], rotation: [-1.0, 0, -0.38],
  finish: 'surface', slot: 'body', furry: true, markings: { ...SPOTS, scale: 8, coverage: 0.5, seed: 3 },
};
const leg: PartDef = {
  id: 'footL', parent: 'root', role: 'footL', shape: 'blob', size: [1], blob: LEG, position: [0.2, 0.5, 0.02], finish: 'surface', slot: 'body', furry: true,
  markings: { ...SPOTS, scale: 7, coverage: 0.5, seed: 4 },
};
const hz = (x: number, y: number) => surfaceZ(HEAD, x, y);
const bz = (x: number, y: number) => surfaceZ(BODY, x, y);
const whisker = (id: string, side: 1 | -1, y: number, rz: number): PartDef => ({
  id, parent: 'head', shape: 'capsule', size: [0.0035, 0.34], axis: 'x', position: [side * 0.2, 0.2 + y, hz(0.2, 0.2 + y) - 0.01], rotation: [0, side * 0.35, side * rz],
  offset: [side * 0.17, 0, 0], finish: 'matte', color: '#f6f3ee',
});

export const lumi: MascotDefinition = {
  id: 'lumi',
  name: 'Lumi',
  species: 'Snow leopard cub',
  tagline: 'Quick, quiet and always one step ahead of the build.',
  family: 'Soft & furry',
  personality: ['Focused', 'Playful', 'Precise'],
  description: 'Lumi has a short, dense coat painted with soft grey spots, ringed rosettes on the limbs and a huge curled tail, round grey-backed ears, whiskers and a cheeky smile. A lithe body and heavy tail give the animator more to do than any other character.',
  signature: { accessory: 'scarf', charms: ['terminal', 'branch', 'bolt'], state: 'coding', expression: 'happy' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/lumi.webp',
  palette: { body: '#f3efe7', accent: '#f8f4ec', eye: '#5b3216', eye2: '#5b3216', cheek: '#f3b0a8', brow: '#6a6a72', earInner: '#efb7ac', pad: '#5a5560', nose: '#6e5450', claw: '#3d322f', marking: '#7a7f8c' },
  defaults: { surface: 'shortFur', expression: 'happy', lighting: 'soft', world: 'devDesk', camera: 'hero' },
  framing: { height: 2.2, center: [0, 1.0, 0] },
  fur: { length: 0.9, density: 1.15, fluff: 0.4, softness: 0.55, gravity: 0.8, variation: 0.4 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.2,
  occluders: [
    { role: 'head', center: [0, 0.34, 0.02], r: 0.44 }, { role: 'body', center: [0, 0, 0], r: 0.36 },
    { role: 'armL', center: [0, -0.2, 0.03], r: 0.11 }, { role: 'armR', center: [0, -0.2, 0.03], r: 0.11 },
    { role: 'footL', center: [0, -0.2, 0.05], r: 0.15 }, { role: 'footR', center: [0, -0.2, 0.05], r: 0.15 },
  ],
  attach: {
    head: { parent: 'head', position: [0, 0.38, 0], scale: 0.53 },
    face: { parent: 'head', position: [0, 0.37, hz(0, 0.37) + 0.03], scale: 0.2 },
    neck: { parent: 'body', position: [0, 0.4, 0.0], scale: 0.28 },
    chest: { parent: 'body', position: [0.14, 0.2, bz(0.14, 0.2) + 0.01], rotation: [0, 0.4, 0], scale: 0.08 },
    back: { parent: 'body', position: [0, 0.05, -0.32], scale: 0.42 },
    handR: { parent: 'armR', position: [0, -0.4, 0.1] },
    handL: { parent: 'armL', position: [0, -0.4, 0.1] },
    charmRail: { parent: 'body', position: [0, -0.16, bz(0, -0.16) + 0.01], scale: 0.1 },
  },
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'blob', size: [1], blob: BODY, position: [0, 0.76, 0], finish: 'surface', slot: 'body', furry: true, hit: true, markings: { ...SPOTS, scale: 6, coverage: 0.5, size: 0.5, seed: 1 } },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'blob', size: [1], blob: HEAD, position: [0, 1.22, 0.04], finish: 'surface', slot: 'body', furry: true, hit: true,
      flow: { radial: 0.65, origin: [0, 0.2, 0.6] }, markings: { ...SPOTS, scale: 7, coverage: 0.32, size: 0.42, seed: 5 },
      furMask: [{ center: [0, 0.16, 0.4], radii: [0.44, 0.3, 0.27], fade: 0.3 }, { center: [0.2, 0.38, 0.4], radii: [0.13, 0.15, 0.1], fade: 0 }, { center: [-0.2, 0.38, 0.4], radii: [0.13, 0.15, 0.1], fade: 0 }],
    },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.105, 0.105, 0.04], position: [0, 0.04, 0.035], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.105, 0.105, 0.04], position: [0, 0.04, 0.035], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', head: HEAD, eye: { x: 0.2, y: 0.38, w: 0.108, h: 0.124, iris: 0.9, pupil: 0.46 }, nose: { y: 0.255, w: 0.08, h: 0.052 },
      mouth: { y: 0.148, r: 0.07 }, cheek: { x: 0.37, y: 0.17, r: 0.12 }, brow: { x: 0.2, y: 0.54, len: 0.095 },
    }),
    whisker('whiskA', 1, 0.0, -0.08), whisker('whiskB', 1, 0.04, 0.14), whisker('whiskC', 1, -0.04, -0.28),
    whisker('whiskD', -1, 0.0, -0.08), whisker('whiskE', -1, 0.04, 0.14), whisker('whiskF', -1, -0.04, -0.28),
    arm, mirror(arm, 'armR', 'armR'),
    ...[-0.04, 0, 0.04].flatMap((dx, i) => (['L', 'R'] as const).map((s): PartDef => ({ id: `claw${s}${i}`, parent: `arm${s}`, shape: 'sphere', size: [1], stretch: [0.014, 0.02, 0.012], position: [dx, -0.45 - Math.abs(dx) * 0.2, 0.06], finish: 'pad', slot: 'claw' }))),
    leg, mirror(leg, 'footR', 'footR'),
    ...[-0.07, 0, 0.07].flatMap((dx, i) => (['L', 'R'] as const).map((s): PartDef => ({ id: `fclaw${s}${i}`, parent: `foot${s}`, shape: 'sphere', size: [1], stretch: [0.018, 0.026, 0.016], position: [dx, -0.4, 0.345 - Math.abs(dx) * 0.5], finish: 'pad', slot: 'claw' }))),
    {
      id: 'tail', parent: 'body', role: 'tail', shape: 'blob', size: [1], blob: TAIL, position: [0, -0.28, -0.3], finish: 'surface', slot: 'body', furry: true,
      markings: { slot: 'marking', kind: 'rosettes', scale: 6, coverage: 0.6, size: 0.42, seed: 2 },
    },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Coat', swatches: ['#f3efe7', '#e5ddd0', '#d7e3f4', '#d9c3a4', '#bfc4cc', '#3a3a40'] },
      { slot: 'marking', label: 'Markings', swatches: ['#7a7f8c', '#5a5f6a', '#b79a74', '#3a3a40', '#6a8fc9', '#a06ac9'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#5b3216', '#47c1d1', '#2d7bd6', '#3c8a6a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f3b0a8', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'earInner', label: 'Inner ears', swatches: ['#efb7ac', '#f4c9d4', '#d7b5f0', '#b5d9f0', '#f1d9a8', '#8f8f98'] },
    ],
    surfaces: ['shortFur', 'furry', 'fuzzy', 'plush', 'wool', 'fleece', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#e9eef5', '#bcc6d4'],
};
