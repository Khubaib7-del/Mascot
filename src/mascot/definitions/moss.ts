import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

const earL: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'sphere', size: [1], stretch: [0.13, 0.19, 0.075],
  position: [0.33, 0.64, -0.02], rotation: [0, 0, -0.38], offset: [0, 0.11, 0], finish: 'surface', slot: 'body', furry: true, hit: true,
};
const armL: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'capsule', size: [0.078, 0.16],
  position: [0.42, 0.1, 0.02], rotation: [0, 0, 0.28], offset: [0, -0.13, 0], finish: 'surface', slot: 'body', furry: true,
};
const footL: PartDef = {
  id: 'footL', parent: 'root', shape: 'sphere', size: [1], stretch: [0.14, 0.09, 0.17],
  position: [0.2, 0.09, 0.13], finish: 'surface', slot: 'body', furry: true,
};

export const moss: MascotDefinition = {
  id: 'moss',
  name: 'Moss',
  tagline: 'A deep-pile creature that listens with its whole body.',
  family: 'Soft & furry',
  description:
    'Moss is built around dimensional shell fur: every strand has a root shadow, a lit tip and a rim of backscatter, so the silhouette stays soft from any angle.',
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/moss.webp',
  surfaceThumbs: {
    smooth: '/thumbs/moss-smooth.webp', plush: '/thumbs/moss-plush.webp', fuzzy: '/thumbs/moss-fuzzy.webp', furry: '/thumbs/moss.webp',
  },
  palette: { body: '#a3b88f', accent: '#f2e7cf', eye: '#d89a45', cheek: '#ee9c8d', detail: '#4d5a41' },
  defaults: { surface: 'furry', expression: 'neutral', environment: 'daylight', camera: 'hero' },
  framing: { height: 1.95, center: [0, 0.95, 0] },
  swatch: ['#e6ecd9', '#b9cba5'],
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.47, 0.46, 0.43], position: [0, 0.5, 0], finish: 'surface', slot: 'body', furry: true, hit: true },
    { id: 'belly', parent: 'body', shape: 'sphere', size: [1], stretch: [0.28, 0.29, 0.12], position: [0, -0.04, 0.34], finish: 'surface', slot: 'accent', furry: true },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'sphere', size: [1], stretch: [0.57, 0.48, 0.5], position: [0, 0.82, 0], offset: [0, 0.29, 0.02],
      finish: 'surface', slot: 'body', furry: true, hit: true, furMask: { center: [0, -0.1, 0.4], radii: [0.42, 0.34, 0.3] },
    },
    earL, mirror(earL, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.068, 0.1, 0.03], position: [0, 0.11, 0.05], finish: 'matte', slot: 'accent' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.068, 0.1, 0.03], position: [0, 0.11, 0.05], finish: 'matte', slot: 'accent' },
    ...face({
      parent: 'head', eyeAt: [0.19, 0.27, 0.495], eyeSize: [0.078, 0.098, 0.05], irisSize: [0.056, 0.074, 0.03],
      mouthAt: [0, 0.115, 0.5], mouthRadius: 0.06, cheekAt: [0.315, 0.145, 0.415], cheekSize: [0.072, 0.05, 0.016], browAt: [0.19, 0.405, 0.5],
    }),
    { id: 'nose', parent: 'head', shape: 'sphere', size: [1], stretch: [0.032, 0.022, 0.02], position: [0, 0.185, 0.51], finish: 'gloss', color: '#4b3a36' },
    armL, mirror(armL, 'armR', 'armR'),
    footL, mirror(footL, 'footR'),
    { id: 'tail', parent: 'body', role: 'tail', shape: 'sphere', size: [1], stretch: [0.13, 0.13, 0.13], position: [0, -0.14, -0.4], offset: [0, 0.03, -0.06], finish: 'surface', slot: 'accent', furry: true },
    { id: 'glassesL', parent: 'head', accessory: 'glasses', shape: 'ring', size: [0.118, 0.011], position: [0.19, 0.27, 0.585], finish: 'gloss', slot: 'detail' },
    { id: 'glassesR', parent: 'head', accessory: 'glasses', shape: 'ring', size: [0.118, 0.011], position: [-0.19, 0.27, 0.585], finish: 'gloss', slot: 'detail' },
    { id: 'glassesBridge', parent: 'head', accessory: 'glasses', shape: 'capsule', size: [0.01, 0.07], axis: 'x', position: [0, 0.28, 0.585], finish: 'gloss', slot: 'detail' },
    { id: 'sproutStem', parent: 'head', accessory: 'sprout', shape: 'capsule', size: [0.012, 0.1], position: [0, 0.75, 0.02], rotation: [0, 0, 0.12], offset: [0, 0.05, 0], finish: 'gloss', slot: 'detail' },
    { id: 'sproutLeafA', parent: 'head', accessory: 'sprout', shape: 'sphere', size: [1], stretch: [0.1, 0.035, 0.05], position: [0.07, 0.89, 0.02], rotation: [0, 0, 0.5], finish: 'gloss', slot: 'accent' },
    { id: 'sproutLeafB', parent: 'head', accessory: 'sprout', shape: 'sphere', size: [1], stretch: [0.1, 0.035, 0.05], position: [-0.07, 0.87, 0.02], rotation: [0, 0, -0.5], finish: 'gloss', slot: 'accent' },
    { id: 'scarf', parent: 'root', accessory: 'scarf', shape: 'ring', size: [0.4, 0.08], position: [0, 0.8, 0.02], rotation: [Math.PI / 2, 0, 0], stretch: [1, 1.05, 1], finish: 'matte', slot: 'accent' },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Coat', swatches: ['#a3b88f', '#e8b7a4', '#9db4d3', '#d9c27a', '#b7a2d1', '#6f7f5e'] },
      { slot: 'accent', label: 'Accent', swatches: ['#f2e7cf', '#ffffff', '#e9a27a', '#f4cf6d', '#c9d8ee', '#2f3a2a'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#d89a45', '#5aa9a0', '#7f8fe0', '#6fb36b', '#d8647a', '#b9c0cc'] },
    ],
    surfaces: ['furry', 'fuzzy', 'plush', 'smooth', 'synthetic', 'metallic'],
    accessories: [{ id: 'glasses', label: 'Round glasses' }, { id: 'sprout', label: 'Sprout' }, { id: 'scarf', label: 'Scarf' }],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate'],
  environments: ['studio', 'daylight', 'warmRoom', 'cinematic', 'pastel', 'rim'],
};
