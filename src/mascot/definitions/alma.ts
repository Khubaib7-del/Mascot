import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'sphere', size: [1], stretch: [0.085, 0.27, 0.05],
  position: [0.17, 0.4, -0.02], rotation: [0.08, 0, -0.22], offset: [0, 0.2, 0], finish: 'surface', slot: 'body', furry: true, fur: { length: 0.45 }, hit: true,
};
const frontLeg: PartDef = {
  id: 'legFL', parent: 'root', role: 'legFL', shape: 'capsule', size: [0.078, 0.44],
  position: [0.17, 0.66, 0.2], offset: [0, -0.3, 0], finish: 'surface', slot: 'body', furry: true, fur: { length: 0.75 },
};
const backLeg: PartDef = { ...frontLeg, id: 'legBL', role: 'legBL', position: [0.17, 0.66, -0.24] };
const hoof = (id: string, parent: string): PartDef => ({ id, parent, shape: 'sphere', size: [1], stretch: [0.09, 0.055, 0.11], position: [0, -0.6, 0.02], finish: 'pad', slot: 'hoof' });

export const alma: MascotDefinition = {
  id: 'alma',
  name: 'Alma',
  species: 'Baby alpaca',
  tagline: 'A long-necked fluff who notices everything first.',
  family: 'Wool & fibre',
  personality: ['Inquisitive', 'Bright', 'Sociable'],
  description: 'Alma trades short fur for locks of wool: clumped, curled fibres, a bouncing topknot and tall expressive ears. A long neck lets her lead with her head — perfect for a research-minded agent.',
  signature: { accessory: 'backpack', charms: ['magnifier', 'book', 'star'], state: 'researching', expression: 'curious' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/alma.webp',
  palette: { body: '#f2e4cf', accent: '#f8eddc', eye: '#7a4a2a', eye2: '#7a4a2a', cheek: '#f2a08f', brow: '#4a3a30', earInner: '#ecb2a2', hoof: '#4a3b36', nose: '#b5857a', marking: '#d9c3a4' },
  defaults: { surface: 'wool', expression: 'happy', lighting: 'morning', world: 'forest', camera: 'hero' },
  framing: { height: 2.65, center: [0, 1.25, 0] },
  fur: { length: 1.25, density: 0.8, fluff: 0.85, softness: 0.5, gravity: 0.8, variation: 0.6 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.32,
  roleAliases: { armL: 'legFL', armR: 'legFR' },
  attach: {
    head: { parent: 'head', position: [0, 0.2, 0.03], scale: 0.32 },
    face: { parent: 'head', position: [0, 0.27, 0.32], scale: 0.14 },
    neck: { parent: 'neck', position: [0, 0.22, 0.02], scale: 0.2 },
    chest: { parent: 'body', position: [0.1, 0.12, 0.47], rotation: [0, 0.3, 0], scale: 0.085 },
    back: { parent: 'body', position: [0, 0.22, -0.28], scale: 0.4 },
    handR: { parent: 'legFR', position: [0, -0.6, 0.04] },
    handL: { parent: 'legFL', position: [0, -0.6, 0.04] },
    charmRail: { parent: 'body', position: [0, -0.1, 0.5], scale: 0.1 },
  },
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.38, 0.42, 0.52], position: [0, 0.84, -0.02], finish: 'surface', slot: 'body', furry: true, hit: true },
    { id: 'chest', parent: 'body', shape: 'sphere', size: [1], stretch: [0.3, 0.3, 0.22], position: [0, 0.08, 0.34], finish: 'surface', slot: 'accent', furry: true },
    { id: 'neck', parent: 'root', role: 'neck', shape: 'capsule', size: [0.16, 0.55], position: [0, 0.98, 0.3], rotation: [0.1, 0, 0], offset: [0, 0.42, 0], finish: 'surface', slot: 'body', furry: true, fur: { length: 0.9 } },
    {
      id: 'head', parent: 'neck', role: 'head', shape: 'sphere', size: [1], stretch: [0.3, 0.27, 0.31], position: [0, 0.88, 0.03], offset: [0, 0.2, 0.05],
      finish: 'surface', slot: 'body', furry: true, hit: true, fur: { length: 0.55 }, furMask: { center: [0, -0.1, 0.3], radii: [0.24, 0.2, 0.2] },
    },
    { id: 'topknot', parent: 'head', role: 'topknot', shape: 'sphere', size: [1], stretch: [0.21, 0.15, 0.2], position: [0, 0.48, 0.1], finish: 'surface', slot: 'body', furry: true, fur: { length: 2.2, density: 0.55 } },
    { id: 'muzzle', parent: 'head', shape: 'sphere', size: [1], stretch: [0.16, 0.12, 0.12], position: [0, 0.1, 0.3], finish: 'surface', slot: 'accent', furry: true, fur: { length: 0.35 } },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.05, 0.19, 0.025], position: [0, 0.2, 0.035], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.05, 0.19, 0.025], position: [0, 0.2, 0.035], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', eyeAt: [0.135, 0.265, 0.285], eyeSize: [0.075, 0.09, 0.045], irisSize: [0.06, 0.075, 0.026],
      mouthAt: [0, 0.075, 0.415], mouthRadius: 0.05, cheekAt: [0.24, 0.12, 0.2], cheekSize: [0.06, 0.045, 0.014], browAt: [0.135, 0.37, 0.265],
    }),
    { id: 'nose', parent: 'head', shape: 'sphere', size: [1], stretch: [0.04, 0.028, 0.024], position: [0, 0.145, 0.415], finish: 'gloss', slot: 'nose' },
    frontLeg, mirror(frontLeg, 'legFR', 'legFR'), backLeg, mirror(backLeg, 'legBR', 'legBR'),
    hoof('hoofFL', 'legFL'), hoof('hoofFR', 'legFR'), hoof('hoofBL', 'legBL'), hoof('hoofBR', 'legBR'),
    { id: 'tail', parent: 'body', role: 'tail', shape: 'sphere', size: [1], stretch: [0.13, 0.13, 0.13], position: [0, 0.22, -0.5], offset: [0, 0.02, -0.06], finish: 'surface', slot: 'body', furry: true, fur: { length: 1.6 } },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Wool', swatches: ['#f2e4cf', '#ffffff', '#d9b68a', '#b98d62', '#8a6a52', '#4a3a34'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#7a4a2a', '#2d7bd6', '#3c8a6a', '#a05a2a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f2a08f', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'earInner', label: 'Inner ears', swatches: ['#ecb2a2', '#f4c9d4', '#d7b5f0', '#b5d9f0', '#f1d9a8', '#8f8f98'] },
      { slot: 'hoof', label: 'Hooves', swatches: ['#4a3b36', '#2f3440', '#8a6a52', '#c9a074', '#6a3fa0', '#3b5bdb'] },
    ],
    surfaces: ['wool', 'furry', 'shortFur', 'fuzzy', 'fleece', 'plush', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#f5ead8', '#d9c3a4'],
};
