import { E, RC, surfaceZ, type BlobSpec } from '../../engine/blob';
import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

// Baby alpaca: small round head on a long neck, tall ears, slim body, thin legs ending in dark hooves,
// a forehead tuft and a puff of tail — following the supplied reference.
const HEAD: BlobSpec = {
  k: 0.12,
  prims: [E([0, 0.18, 0.02], [0.36, 0.32, 0.33]), E([0, 0.03, 0.3], [0.21, 0.16, 0.17]), E([0, -0.01, 0.18], [0.24, 0.13, 0.22])],
};
const BODY: BlobSpec = { k: 0.2, prims: [E([0, 0, -0.04], [0.3, 0.28, 0.48]), E([0, 0.05, 0.28], [0.27, 0.3, 0.26])] };
const NECK: BlobSpec = { k: 0.1, prims: [RC([0, 0, 0], [0, 0.62, 0.05], 0.23, 0.15)] };
const LEG: BlobSpec = { k: 0.08, prims: [RC([0, 0, 0], [0, -0.62, 0.02], 0.13, 0.085)] };
const EAR: BlobSpec = { k: 0.05, prims: [E([0, 0.24, 0], [0.145, 0.29, 0.065]), E([0, 0.25, 0.062], [0.085, 0.2, 0.05], { sub: true })] };
const TUFT: BlobSpec = { k: 0.08, prims: [E([0.03, 0.0, 0.0], [0.23, 0.1, 0.17], { rot: [0.3, 0, -0.28] }), E([-0.08, -0.05, 0.1], [0.12, 0.08, 0.1])] };

const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'blob', size: [1], blob: EAR, position: [0.22, 0.36, -0.01], rotation: [0.06, 0, -0.42],
  finish: 'surface', slot: 'body', furry: true, hit: true, fur: { length: 0.5 }, furMask: { center: [0, 0.26, 0.07], radii: [0.09, 0.2, 0.08], fade: 0 },
};
const frontLeg: PartDef = { id: 'legFL', parent: 'root', role: 'legFL', shape: 'blob', size: [1], blob: LEG, position: [0.15, 0.74, 0.22], finish: 'surface', slot: 'body', furry: true, fur: { length: 0.8 } };
const backLeg: PartDef = { ...frontLeg, id: 'legBL', role: 'legBL', position: [0.15, 0.74, -0.4] };
const hoof = (id: string, parent: string): PartDef => ({ id, parent, shape: 'sphere', size: [1], stretch: [0.1, 0.06, 0.125], position: [0, -0.68, 0.035], finish: 'pad', slot: 'hoof' });
const hz = (x: number, y: number) => surfaceZ(HEAD, x, y);
const bz = (x: number, y: number) => surfaceZ(BODY, x, y);

export const alma: MascotDefinition = {
  id: 'alma',
  name: 'Alma',
  species: 'Baby alpaca',
  tagline: 'A long-necked fluff who notices everything first.',
  family: 'Wool & fibre',
  personality: ['Inquisitive', 'Bright', 'Sociable'],
  description: 'Alma wears curled wool over a slim, long-necked frame: tall rose-lined ears, a swoop of forehead fluff, huge lashed eyes and dark little hooves. The long neck lets her lead with her head — a research-minded agent.',
  signature: { accessory: 'scarf', charms: ['magnifier', 'book', 'star'], state: 'researching', expression: 'happy' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/alma.webp',
  palette: { body: '#f4e8d6', accent: '#f8eddc', eye: '#6a3a1c', eye2: '#6a3a1c', cheek: '#f2a08f', brow: '#4a3a30', earInner: '#e9a89c', hoof: '#4a3b36', nose: '#c99a90', marking: '#d9c3a4' },
  defaults: { surface: 'wool', expression: 'happy', lighting: 'morning', world: 'forest', camera: 'hero' },
  framing: { height: 2.7, center: [0, 1.3, 0] },
  fur: { length: 1.0, density: 1.0, fluff: 0.7, softness: 0.55, gravity: 0.8, variation: 0.5 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.3,
  occluders: [
    { role: 'head', center: [0, 0.16, 0.03], r: 0.3 }, { role: 'body', center: [0, 0, 0], r: 0.3 }, { role: 'neck', center: [0, 0.3, 0.03], r: 0.17 },
    { role: 'legFL', center: [0, -0.3, 0.02], r: 0.11 }, { role: 'legFR', center: [0, -0.3, 0.02], r: 0.11 }, { role: 'legBL', center: [0, -0.3, 0.02], r: 0.11 },
  ],
  roleAliases: { armL: 'legFL', armR: 'legFR', footL: 'legBL', footR: 'legBR' },
  attach: {
    head: { parent: 'head', position: [0, 0.28, 0.02], scale: 0.34 },
    face: { parent: 'head', position: [0, 0.2, hz(0, 0.2) + 0.025], scale: 0.15 },
    neck: { parent: 'neck', position: [0, 0.3, 0.04], scale: 0.22 },
    chest: { parent: 'body', position: [0.12, 0.05, bz(0.12, 0.05) + 0.01], rotation: [0, 0.3, 0], scale: 0.085 },
    back: { parent: 'body', position: [0, 0.22, -0.3], scale: 0.4 },
    handR: { parent: 'legFR', position: [0, -0.6, 0.06] },
    handL: { parent: 'legFL', position: [0, -0.6, 0.06] },
    charmRail: { parent: 'body', position: [0, -0.12, bz(0, -0.12) + 0.01], scale: 0.1 },
  },
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'blob', size: [1], blob: BODY, position: [0, 0.92, -0.1], finish: 'surface', slot: 'body', furry: true, hit: true },
    { id: 'neck', parent: 'root', role: 'neck', shape: 'blob', size: [1], blob: NECK, position: [0, 1.0, 0.3], rotation: [0.08, 0, 0], finish: 'surface', slot: 'body', furry: true, fur: { length: 0.9 }, flow: { bend: 1.2 } },
    {
      id: 'head', parent: 'neck', role: 'head', shape: 'blob', size: [1], blob: HEAD, position: [0, 0.62, 0.05], finish: 'surface', slot: 'body', furry: true, hit: true, fur: { length: 0.55 },
      flow: { radial: 0.6, origin: [0, 0.1, 0.4] },
      furMask: [{ center: [0, 0.04, 0.3], radii: [0.2, 0.17, 0.17], fade: 0.25 }, { center: [0.155, 0.22, 0.29], radii: [0.13, 0.15, 0.11], fade: 0 }, { center: [-0.155, 0.22, 0.29], radii: [0.13, 0.15, 0.11], fade: 0 }],
    },
    { id: 'topknot', parent: 'head', role: 'topknot', shape: 'blob', size: [1], blob: TUFT, position: [0, 0.5, 0.08], finish: 'surface', slot: 'body', furry: true, fur: { length: 1.3, density: 0.7 }, flow: { bend: 1.6 } },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.085, 0.2, 0.04], position: [0, 0.25, 0.04], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.085, 0.2, 0.04], position: [0, 0.25, 0.04], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', head: HEAD, eye: { x: 0.155, y: 0.22, w: 0.085, h: 0.1, iris: 0.9, pupil: 0.5 }, nose: { y: 0.08, w: 0.062, h: 0.042, shape: 'alpaca' },
      mouth: { y: 0.0, r: 0.062 }, cheek: { x: 0.25, y: 0.07, r: 0.085 }, lashes: true,
    }),
    frontLeg, mirror(frontLeg, 'legFR', 'legFR'), backLeg, mirror(backLeg, 'legBR', 'legBR'),
    hoof('hoofFL', 'legFL'), hoof('hoofFR', 'legFR'), hoof('hoofBL', 'legBL'), hoof('hoofBR', 'legBR'),
    { id: 'tail', parent: 'body', role: 'tail', shape: 'blob', size: [1], blob: { k: 0.05, prims: [E([0, 0, -0.08], [0.16, 0.16, 0.16])] }, position: [0, 0.1, -0.5], finish: 'surface', slot: 'body', furry: true, fur: { length: 1.4 } },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Wool', swatches: ['#f4e8d6', '#ffffff', '#d9b68a', '#b98d62', '#8a6a52', '#4a3a34'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#6a3a1c', '#2d7bd6', '#3c8a6a', '#a05a2a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f2a08f', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'earInner', label: 'Inner ears', swatches: ['#e9a89c', '#f4c9d4', '#d7b5f0', '#b5d9f0', '#f1d9a8', '#8f8f98'] },
      { slot: 'hoof', label: 'Hooves', swatches: ['#4a3b36', '#2f3440', '#8a6a52', '#c9a074', '#6a3fa0', '#3b5bdb'] },
    ],
    surfaces: ['wool', 'fleece', 'furry', 'shortFur', 'fuzzy', 'plush', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#f5ead8', '#d9c3a4'],
};
