import type { MascotDefinition, PartDef } from '../types';
import { mirror } from './helpers';

const arm: PartDef = {
  id: 'armL', parent: 'root', role: 'armL', shape: 'sphere', size: [1], stretch: [0.085, 0.13, 0.085],
  position: [0.46, 0.62, 0], rotation: [0, 0, 0.2], offset: [0, -0.1, 0], finish: 'surface', slot: 'body',
};

export const orbit: MascotDefinition = {
  id: 'orbit',
  name: 'Orbit',
  species: 'Synthetic companion',
  tagline: 'A coated-polymer companion whose face is a window, not a mask.',
  family: 'Synthetic',
  personality: ['Calm', 'Exact', 'Quietly bold'],
  description: 'Orbit swaps fur for clearcoated polymer: tight reflections, a smoked visor and emissive eyes. Same rig, same animation system, an entirely different material language.',
  signature: { accessory: 'badge', charms: ['rocket', 'reactor', 'gear'], state: 'deploying', expression: 'excited' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/orbit.webp',
  palette: { body: '#eceff4', accent: '#ff7d5c', eye: '#79e0d0', eye2: '#79e0d0', detail: '#2a2f3a', brow: '#2a2f3a', cheek: '#ff7d5c' },
  defaults: { surface: 'synthetic', expression: 'happy', lighting: 'night', world: 'space', camera: 'hero' },
  framing: { height: 1.85, center: [0, 0.9, 0] },
  fur: { length: 1, density: 1, fluff: 0.5, softness: 0.5, gravity: 1, variation: 0.3 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.12,
  attach: {
    head: { parent: 'head', position: [0, 0.22, 0], scale: 0.53 },
    face: { parent: 'head', position: [0, 0.23, 0.53], scale: 0.15 },
    neck: { parent: 'body', position: [0, 0.4, 0.02], scale: 0.34 },
    chest: { parent: 'body', position: [0.17, 0.14, 0.37], rotation: [0, 0.4, 0], scale: 0.085 },
    back: { parent: 'body', position: [0, 0.05, -0.36], scale: 0.38 },
    handR: { parent: 'armR', position: [0, -0.2, 0.03] },
    handL: { parent: 'armL', position: [0, -0.2, 0.03] },
    charmRail: { parent: 'body', position: [0, -0.2, 0.38], scale: 0.11 },
  },
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
    arm, mirror(arm, 'armR', 'armR'),
    { id: 'footL', parent: 'root', role: 'footL', shape: 'sphere', size: [1], stretch: [0.13, 0.08, 0.16], position: [0.17, 0.08, 0.1], finish: 'surface', slot: 'body' },
    { id: 'footR', parent: 'root', role: 'footR', shape: 'sphere', size: [1], stretch: [0.13, 0.08, 0.16], position: [-0.17, 0.08, 0.1], finish: 'surface', slot: 'body' },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Shell', swatches: ['#eceff4', '#c9d6ee', '#f1d9cf', '#c8e3d4', '#2f3440', '#d9d0f0'] },
      { slot: 'accent', label: 'Accent', swatches: ['#ff7d5c', '#4d7cff', '#ffc94d', '#37c9a1', '#ff6fa8', '#ffffff'] },
      { slot: 'eye', label: 'Light', swatches: ['#79e0d0', '#ffd479', '#9db8ff', '#ff9fb8', '#b9f06a', '#ffffff'] },
    ],
    surfaces: ['synthetic', 'glossy', 'smooth', 'rubber', 'matte', 'metallic', 'translucent', 'velvet', 'plush'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#e7ecf3', '#c8d2e0'],
};
