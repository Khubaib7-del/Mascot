import { E, RC, surfaceZ, type BlobSpec } from '../../engine/blob';
import type { MascotDefinition, PartDef } from '../types';
import { face, mirror, pawPads } from './helpers';

// Proportions follow the polar-bear reference: a very large round head with full cheeks, a pear-shaped torso,
// short thick limbs, big paws. All coordinates are in the owning part's local space.
const HEAD: BlobSpec = {
  k: 0.13,
  prims: [
    E([0, 0.36, 0], [0.52, 0.44, 0.46]),
    E([0.3, 0.2, 0.1], [0.3, 0.24, 0.32]), E([-0.3, 0.2, 0.1], [0.3, 0.24, 0.32]),
    E([0, 0.2, 0.4], [0.22, 0.16, 0.17]),
    E([0, 0.06, 0.2], [0.3, 0.14, 0.28]),
  ],
};
const BODY: BlobSpec = {
  k: 0.2,
  prims: [E([0, -0.1, 0.03], [0.56, 0.46, 0.46]), E([0, 0.27, 0], [0.37, 0.3, 0.32]), E([0, -0.32, -0.02], [0.52, 0.27, 0.42])],
};
const ARM: BlobSpec = { k: 0.09, prims: [RC([0, 0, 0], [0, -0.34, 0.02], 0.155, 0.14), E([0, -0.43, 0.04], [0.155, 0.14, 0.14])] };
const LEG: BlobSpec = { k: 0.1, prims: [RC([0, 0, 0], [0, -0.3, 0.02], 0.2, 0.19), E([0, -0.38, 0.11], [0.2, 0.11, 0.3])] };
const EAR: BlobSpec = { k: 0.05, prims: [E([0.02, 0.07, 0], [0.19, 0.19, 0.1]), E([0, 0.05, 0.1], [0.125, 0.125, 0.07], { sub: true })] };

const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'blob', size: [1], blob: EAR, position: [0.38, 0.64, -0.05], rotation: [0, 0, -0.3],
  finish: 'surface', slot: 'body', furry: true, hit: true, fur: { length: 0.8 }, furMask: { center: [0, 0.05, 0.08], radii: [0.14, 0.14, 0.1], fade: 0 },
};
const arm: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'blob', size: [1], blob: ARM, position: [0.43, 0.36, 0.04], rotation: [0, 0, 0.22],
  finish: 'surface', slot: 'body', furry: true, furMask: { center: [0, -0.46, 0.15], radii: [0.12, 0.13, 0.08], fade: 0.1 },
};
const leg: PartDef = {
  id: 'footL', parent: 'root', role: 'footL', shape: 'blob', size: [1], blob: LEG, position: [0.26, 0.5, 0.02],
  finish: 'surface', slot: 'body', furry: true, furMask: { center: [0, -0.38, 0.38], radii: [0.2, 0.1, 0.1], fade: 0.15 },
};
const footClaws = (side: 'L' | 'R'): PartDef[] => {
  const sx = side === 'L' ? 1 : -1;
  return [-0.09, 0, 0.09].map((dx, i) => ({ id: `fclaw${side}${i}`, parent: `foot${side}`, shape: 'sphere', size: [1], stretch: [0.022, 0.03, 0.02], position: [dx * sx * 1 + 0.0, -0.42, 0.405 - Math.abs(dx) * 0.4], finish: 'pad', slot: 'claw' } as PartDef));
};

const headZ = (x: number, y: number) => surfaceZ(HEAD, x, y);
const bodyZ = (x: number, y: number) => surfaceZ(BODY, x, y);

export const floe: MascotDefinition = {
  id: 'floe',
  name: 'Floe',
  species: 'Polar bear cub',
  tagline: 'A dense, plush cub who keeps every conversation warm.',
  family: 'Soft & furry',
  personality: ['Gentle', 'Loyal', 'Patient'],
  description: 'Floe wears a dense, combed coat with soft tufts, a velvet edge of backscattered light and flyaway wisps at the silhouette. Huge glossy eyes, round ears and full cheeks — the dependable agent that waits with you.',
  signature: { accessory: 'scarf', charms: ['mark', 'coffee'], state: 'waiting', expression: 'happy' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/floe.webp',
  palette: { body: '#f7f4ee', accent: '#fbf8f3', eye: '#5a3418', eye2: '#5a3418', cheek: '#f3a9a0', brow: '#5a4a42', earInner: '#efb3a8', pad: '#4a3a38', nose: '#3a2b29', claw: '#3d322f', marking: '#cfd3dc' },
  defaults: { surface: 'shortFur', expression: 'happy', lighting: 'snowy', world: 'mountain', camera: 'hero' },
  framing: { height: 2.3, center: [0, 1.1, 0] },
  fur: { length: 1, density: 1, fluff: 0.55, softness: 0.65, gravity: 1, variation: 0.35 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.2,
  occluders: [
    { role: 'head', center: [0, 0.34, 0.02], r: 0.46 }, { role: 'body', center: [0, 0, 0], r: 0.46 },
    { role: 'armL', center: [0, -0.22, 0.03], r: 0.15 }, { role: 'armR', center: [0, -0.22, 0.03], r: 0.15 },
    { role: 'footL', center: [0, -0.2, 0.05], r: 0.2 }, { role: 'footR', center: [0, -0.2, 0.05], r: 0.2 },
  ],
  attach: {
    head: { parent: 'head', position: [0, 0.38, 0], scale: 0.56 },
    face: { parent: 'head', position: [0, 0.38, headZ(0, 0.38) + 0.03], scale: 0.22 },
    neck: { parent: 'body', position: [0, 0.42, 0.0], scale: 0.34 },
    chest: { parent: 'body', position: [0.2, 0.18, bodyZ(0.2, 0.18) + 0.01], rotation: [0, 0.4, 0], scale: 0.09 },
    back: { parent: 'body', position: [0, 0.05, -0.38], scale: 0.5 },
    handR: { parent: 'armR', position: [0, -0.5, 0.1] },
    handL: { parent: 'armL', position: [0, -0.5, 0.1] },
    charmRail: { parent: 'body', position: [0, -0.14, bodyZ(0, -0.14) + 0.01], scale: 0.12 },
  },
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'blob', size: [1], blob: BODY, position: [0, 0.78, 0], finish: 'surface', slot: 'body', furry: true, hit: true },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'blob', size: [1], blob: HEAD, position: [0, 1.3, 0.04], finish: 'surface', slot: 'body', furry: true, hit: true,
      flow: { radial: 0.65, origin: [0, 0.2, 0.6] },
      furMask: [{ center: [0, 0.16, 0.42], radii: [0.46, 0.3, 0.28], fade: 0.3 }, { center: [0.22, 0.38, 0.42], radii: [0.14, 0.15, 0.1], fade: 0 }, { center: [-0.22, 0.38, 0.42], radii: [0.14, 0.15, 0.1], fade: 0 }],
    },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.115, 0.115, 0.04], position: [0, 0.05, 0.035], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.115, 0.115, 0.04], position: [0, 0.05, 0.035], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', head: HEAD, eye: { x: 0.225, y: 0.385, w: 0.112, h: 0.128, iris: 0.9, pupil: 0.46 }, nose: { y: 0.262, w: 0.096, h: 0.06 },
      mouth: { y: 0.15, r: 0.072 }, cheek: { x: 0.4, y: 0.17, r: 0.13 }, brow: { x: 0.22, y: 0.548, len: 0.1 },
    }),
    arm, mirror(arm, 'armR', 'armR'),
    ...pawPads('armL', [0, -0.45, 0.176], { dir: -1, claws: true, id: 'pawL' }),
    ...pawPads('armR', [0, -0.45, 0.176], { dir: -1, claws: true, id: 'pawR' }),
    leg, mirror(leg, 'footR', 'footR'),
    ...footClaws('L'), ...footClaws('R'),
    { id: 'tail', parent: 'body', role: 'tail', shape: 'blob', size: [1], blob: { k: 0.05, prims: [E([0, 0, -0.06], [0.13, 0.13, 0.13])] }, position: [0, -0.3, -0.4], finish: 'surface', slot: 'body', furry: true },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Coat', swatches: ['#f7f4ee', '#e9dcc9', '#d7e3f4', '#cfc3b2', '#b9b4ac', '#3a3a40'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#3a2418', '#2d7bd6', '#3c8a6a', '#8a5a2a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f3a9a0', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'earInner', label: 'Inner ears', swatches: ['#efb3a8', '#f4c9d4', '#d7b5f0', '#b5d9f0', '#f1d9a8', '#8f8f98'] },
      { slot: 'pad', label: 'Paw pads', swatches: ['#4a3a38', '#7a4a4a', '#2f3440', '#8f6a6a', '#3b5bdb', '#6a3fa0'] },
    ],
    surfaces: ['shortFur', 'furry', 'fuzzy', 'plush', 'wool', 'fleece', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#e8f0fb', '#b8cbe4'],
};
