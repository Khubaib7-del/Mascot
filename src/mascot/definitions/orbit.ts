import type { MascotDefinition, PartDef } from '../types';
import { mirror } from './helpers';

const armL: PartDef = {
  id: 'armL', parent: 'root', role: 'armL', shape: 'sphere', size: [1], stretch: [0.085, 0.13, 0.085],
  position: [0.46, 0.62, 0], rotation: [0, 0, 0.2], offset: [0, -0.1, 0], finish: 'surface', slot: 'body',
};

export const orbit: MascotDefinition = {
  id: 'orbit',
  name: 'Orbit',
  tagline: 'A smooth synthetic companion whose face is a window, not a mask.',
  family: 'Synthetic',
  description: 'Orbit swaps fur for coated polymer: clearcoat, tight reflections and emissive eyes. Same rig, same animation system, entirely different material language.',
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/orbit.webp',
  palette: { body: '#eceff4', accent: '#ff7d5c', eye: '#79e0d0', detail: '#2a2f3a' },
  defaults: { surface: 'synthetic', expression: 'neutral', environment: 'studio', camera: 'hero' },
  framing: { height: 1.85, center: [0, 0.9, 0] },
  swatch: ['#e7ecf3', '#c8d2e0'],
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.44, 0.45, 0.4], position: [0, 0.48, 0], finish: 'surface', slot: 'body', hit: true },
    { id: 'band', parent: 'body', shape: 'ring', size: [0.4, 0.028], position: [0, 0.02, 0], rotation: [Math.PI / 2, 0, 0], stretch: [1.04, 1.04, 1.4], finish: 'gloss', slot: 'accent' },
    { id: 'head', parent: 'root', role: 'head', shape: 'sphere', size: [1], stretch: [0.53, 0.43, 0.46], position: [0, 0.9, 0], offset: [0, 0.22, 0], finish: 'surface', slot: 'body', hit: true },
    { id: 'visor', parent: 'head', shape: 'sphere', size: [1], stretch: [0.4, 0.28, 0.2], position: [0, 0.22, 0.31], finish: 'eye', color: '#0a0c12' },
    { id: 'eyeL', parent: 'head', role: 'eyeL', shape: 'sphere', size: [1], stretch: [0.07, 0.085, 0.02], position: [0.15, 0.23, 0.505], finish: 'glow', slot: 'eye', hit: true },
    { id: 'eyeR', parent: 'head', role: 'eyeR', shape: 'sphere', size: [1], stretch: [0.07, 0.085, 0.02], position: [-0.15, 0.23, 0.505], finish: 'glow', slot: 'eye', hit: true },
    { id: 'mouth', parent: 'head', role: 'mouth', shape: 'smile', size: [0.05, 0.009], position: [0, 0.13, 0.515], finish: 'glow', slot: 'eye' },
    { id: 'antennaStem', parent: 'head', role: 'antenna', shape: 'capsule', size: [0.014, 0.12], position: [0, 0.62, 0], offset: [0, 0.07, 0], finish: 'gloss', slot: 'detail' },
    { id: 'antennaTip', parent: 'antennaStem', shape: 'sphere', size: [0.045], position: [0, 0.16, 0], finish: 'glow', slot: 'accent' },
    { id: 'earPodL', parent: 'head', shape: 'sphere', size: [1], stretch: [0.05, 0.12, 0.12], position: [0.53, 0.22, 0], finish: 'gloss', slot: 'accent' },
    { id: 'earPodR', parent: 'head', shape: 'sphere', size: [1], stretch: [0.05, 0.12, 0.12], position: [-0.53, 0.22, 0], finish: 'gloss', slot: 'accent' },
    armL, mirror(armL, 'armR', 'armR'),
    { id: 'footL', parent: 'root', shape: 'sphere', size: [1], stretch: [0.13, 0.08, 0.16], position: [0.17, 0.08, 0.1], finish: 'surface', slot: 'body' },
    { id: 'footR', parent: 'root', shape: 'sphere', size: [1], stretch: [0.13, 0.08, 0.16], position: [-0.17, 0.08, 0.1], finish: 'surface', slot: 'body' },
    { id: 'halo', parent: 'head', accessory: 'halo', shape: 'ring', size: [0.28, 0.012], position: [0, 0.78, 0], rotation: [Math.PI / 2, 0, 0], finish: 'glow', slot: 'accent' },
    { id: 'badge', parent: 'body', accessory: 'badge', shape: 'sphere', size: [1], stretch: [0.07, 0.07, 0.02], position: [0.17, 0.12, 0.37], rotation: [0, 0.4, 0], finish: 'glow', slot: 'accent' },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Shell', swatches: ['#eceff4', '#c9d6ee', '#f1d9cf', '#c8e3d4', '#2f3440', '#d9d0f0'] },
      { slot: 'accent', label: 'Accent', swatches: ['#ff7d5c', '#4d7cff', '#ffc94d', '#37c9a1', '#ff6fa8', '#ffffff'] },
      { slot: 'eye', label: 'Light', swatches: ['#79e0d0', '#ffd479', '#9db8ff', '#ff9fb8', '#b9f06a', '#ffffff'] },
    ],
    surfaces: ['synthetic', 'smooth', 'metallic', 'plush'],
    accessories: [{ id: 'halo', label: 'Halo' }, { id: 'badge', label: 'Status badge' }],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate'],
  environments: ['studio', 'daylight', 'warmRoom', 'cinematic', 'pastel', 'rim'],
};
