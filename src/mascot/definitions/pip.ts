import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

const earL: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'capsule', size: [0.1, 0.42],
  position: [0.2, 0.55, -0.02], rotation: [0, 0, -0.16], offset: [0, 0.26, 0], finish: 'surface', slot: 'body', furry: true, hit: true,
};
const armL: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'capsule', size: [0.07, 0.14],
  position: [0.33, 0.12, 0.03], rotation: [0, 0, 0.22], offset: [0, -0.12, 0], finish: 'surface', slot: 'body', furry: true,
};
const footL: PartDef = {
  id: 'footL', parent: 'root', shape: 'sphere', size: [1], stretch: [0.12, 0.08, 0.15],
  position: [0.17, 0.08, 0.1], finish: 'surface', slot: 'body', furry: true,
};

export const pip: MascotDefinition = {
  id: 'pip',
  name: 'Pip',
  tagline: 'A tall-eared plush with a very small attention span for being serious.',
  family: 'Plush',
  description: 'Pip uses a short, dense nap and a sheen term instead of long fur — the look of brushed fabric over stuffing, at a fraction of the GPU cost.',
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/pip.webp',
  palette: { body: '#f0bfb0', accent: '#fbe9df', eye: '#4a3a52', cheek: '#e98a86', detail: '#6a4a4f' },
  defaults: { surface: 'plush', expression: 'happy', environment: 'pastel', camera: 'hero' },
  framing: { height: 2.15, center: [0, 1.02, 0] },
  swatch: ['#fbe6dd', '#efbfb0'],
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.38, 0.42, 0.34], position: [0, 0.46, 0], finish: 'surface', slot: 'body', furry: true, hit: true },
    { id: 'belly', parent: 'body', shape: 'sphere', size: [1], stretch: [0.22, 0.25, 0.1], position: [0, -0.03, 0.27], finish: 'surface', slot: 'accent', furry: true },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'sphere', size: [1], stretch: [0.5, 0.42, 0.43], position: [0, 0.8, 0], offset: [0, 0.27, 0.02],
      finish: 'surface', slot: 'body', furry: true, hit: true, furMask: { center: [0, -0.08, 0.34], radii: [0.4, 0.32, 0.28] },
    },
    earL, mirror(earL, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'capsule', size: [0.05, 0.28], position: [0, 0.26, 0.045], finish: 'matte', slot: 'accent' },
    { id: 'earInnerR', parent: 'earR', shape: 'capsule', size: [0.05, 0.28], position: [0, 0.26, 0.045], finish: 'matte', slot: 'accent' },
    ...face({
      parent: 'head', eyeAt: [0.17, 0.25, 0.43], eyeSize: [0.062, 0.08, 0.045], irisSize: [0.044, 0.06, 0.028],
      mouthAt: [0, 0.12, 0.44], mouthRadius: 0.05, cheekAt: [0.3, 0.14, 0.34], cheekSize: [0.065, 0.045, 0.015], browAt: [0.17, 0.37, 0.445],
    }),
    { id: 'nose', parent: 'head', shape: 'sphere', size: [1], stretch: [0.028, 0.02, 0.018], position: [0, 0.18, 0.445], finish: 'gloss', color: '#6a3f45' },
    armL, mirror(armL, 'armR', 'armR'),
    footL, mirror(footL, 'footR'),
    { id: 'tail', parent: 'body', role: 'tail', shape: 'sphere', size: [1], stretch: [0.11, 0.11, 0.11], position: [0, -0.12, -0.32], offset: [0, 0, -0.05], finish: 'surface', slot: 'accent', furry: true },
    { id: 'bowL', parent: 'body', accessory: 'bow', shape: 'cone', size: [0.09, 0.14], position: [0.08, 0.37, 0.28], rotation: [0, 0, -Math.PI / 2], finish: 'matte', slot: 'detail' },
    { id: 'bowR', parent: 'body', accessory: 'bow', shape: 'cone', size: [0.09, 0.14], position: [-0.08, 0.37, 0.28], rotation: [0, 0, Math.PI / 2], finish: 'matte', slot: 'detail' },
    { id: 'bowKnot', parent: 'body', accessory: 'bow', shape: 'sphere', size: [0.04], position: [0, 0.37, 0.285], finish: 'matte', slot: 'detail' },
    { id: 'glassesL', parent: 'head', accessory: 'glasses', shape: 'ring', size: [0.1, 0.01], position: [0.17, 0.25, 0.5], finish: 'gloss', slot: 'detail' },
    { id: 'glassesR', parent: 'head', accessory: 'glasses', shape: 'ring', size: [0.1, 0.01], position: [-0.17, 0.25, 0.5], finish: 'gloss', slot: 'detail' },
    { id: 'glassesBridge', parent: 'head', accessory: 'glasses', shape: 'capsule', size: [0.009, 0.06], axis: 'x', position: [0, 0.26, 0.5], finish: 'gloss', slot: 'detail' },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Fabric', swatches: ['#f0bfb0', '#c9d6ee', '#e7d3a1', '#c5b3dd', '#a8cfc0', '#e9e4dc'] },
      { slot: 'accent', label: 'Lining', swatches: ['#fbe9df', '#ffffff', '#ffd1a8', '#f7e9a0', '#dfe9fa', '#46343a'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#4a3a52', '#2f6f8f', '#7a4e2d', '#3c7c58', '#a33d5e', '#1b1b22'] },
    ],
    surfaces: ['plush', 'fuzzy', 'furry', 'smooth', 'synthetic'],
    accessories: [{ id: 'bow', label: 'Bow' }, { id: 'glasses', label: 'Round glasses' }],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate'],
  environments: ['studio', 'daylight', 'warmRoom', 'cinematic', 'pastel', 'rim'],
};
