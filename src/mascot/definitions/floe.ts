import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'sphere', size: [1], stretch: [0.17, 0.17, 0.09],
  position: [0.43, 0.76, -0.02], rotation: [0, 0, -0.32], offset: [0, 0.04, 0], finish: 'surface', slot: 'body', furry: true, hit: true,
};
const arm: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'capsule', size: [0.11, 0.2],
  position: [0.5, 0.38, 0.04], rotation: [0, 0, 0.28], offset: [0, -0.19, 0], finish: 'surface', slot: 'body', furry: true,
};
const foot: PartDef = {
  id: 'footL', parent: 'root', role: 'footL', shape: 'sphere', size: [1], stretch: [0.19, 0.12, 0.25],
  position: [0.25, 0.12, 0.15], finish: 'surface', slot: 'body', furry: true,
};

export const floe: MascotDefinition = {
  id: 'floe',
  name: 'Floe',
  species: 'Polar bear cub',
  tagline: 'A dense, plush cub who keeps every conversation warm.',
  family: 'Soft & furry',
  personality: ['Gentle', 'Loyal', 'Patient'],
  description: 'Floe wears a short, dense coat with soft root shadow and a pale rim of backscatter. Wide dark eyes, round ears and a calm face — built to be the dependable agent that waits with you.',
  signature: { accessory: 'scarf', charms: ['mark', 'coffee'], state: 'waiting', expression: 'relaxed' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/floe.webp',
  palette: { body: '#f6f3ee', accent: '#fbf8f3', eye: '#5b3b2a', eye2: '#5b3b2a', cheek: '#f2a9a0', brow: '#6a5a50', earInner: '#efb7ac', pad: '#4a3a38', nose: '#3b2d2b', marking: '#cfd3dc' },
  defaults: { surface: 'shortFur', expression: 'happy', lighting: 'snowy', world: 'mountain', camera: 'hero' },
  framing: { height: 2.15, center: [0, 1.02, 0] },
  fur: { length: 1, density: 1, fluff: 0.5, softness: 0.65, gravity: 1, variation: 0.35 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.2,
  attach: {
    head: { parent: 'head', position: [0, 0.34, 0], scale: 0.6 },
    face: { parent: 'head', position: [0, 0.32, 0.575], scale: 0.2 },
    neck: { parent: 'body', position: [0, 0.46, 0.02], scale: 0.4 },
    chest: { parent: 'body', position: [0.2, 0.14, 0.42], rotation: [0, 0.4, 0], scale: 0.09 },
    back: { parent: 'body', position: [0, 0.08, -0.4], scale: 0.43 },
    handR: { parent: 'armR', position: [0, -0.38, 0.06] },
    handL: { parent: 'armL', position: [0, -0.38, 0.06] },
    charmRail: { parent: 'body', position: [0, -0.18, 0.44], scale: 0.12 },
  },
  parts: [
    { id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.5, 0.58, 0.46], position: [0, 0.68, 0], finish: 'surface', slot: 'body', furry: true, hit: true },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'sphere', size: [1], stretch: [0.58, 0.5, 0.52], position: [0, 1.16, 0], offset: [0, 0.34, 0.02],
      finish: 'surface', slot: 'body', furry: true, hit: true, furMask: { center: [0, -0.12, 0.44], radii: [0.4, 0.36, 0.3] },
    },
    { id: 'muzzle', parent: 'head', shape: 'sphere', size: [1], stretch: [0.2, 0.15, 0.15], position: [0, 0.2, 0.47], finish: 'surface', slot: 'accent', furry: true, fur: { length: 0.5 } },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.1, 0.1, 0.04], position: [0, 0.03, 0.07], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.1, 0.1, 0.04], position: [0, 0.03, 0.07], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', eyeAt: [0.205, 0.33, 0.485], eyeSize: [0.088, 0.104, 0.05], irisSize: [0.07, 0.088, 0.03],
      mouthAt: [0, 0.2, 0.612], mouthRadius: 0.065, cheekAt: [0.38, 0.18, 0.37], cheekSize: [0.08, 0.055, 0.016], browAt: [0.205, 0.5, 0.468],
    }),
    { id: 'nose', parent: 'head', shape: 'sphere', size: [1], stretch: [0.066, 0.045, 0.04], position: [0, 0.285, 0.612], finish: 'gloss', slot: 'nose' },
    arm, mirror(arm, 'armR', 'armR'),
    { id: 'padL', parent: 'armL', shape: 'sphere', size: [1], stretch: [0.065, 0.07, 0.022], position: [0, -0.34, 0.1], finish: 'pad', slot: 'pad' },
    { id: 'padR', parent: 'armR', shape: 'sphere', size: [1], stretch: [0.065, 0.07, 0.022], position: [0, -0.34, 0.1], finish: 'pad', slot: 'pad' },
    foot, mirror(foot, 'footR', 'footR'),
    { id: 'toeL', parent: 'footL', shape: 'sphere', size: [1], stretch: [0.08, 0.04, 0.03], position: [0, -0.01, 0.245], finish: 'pad', slot: 'pad' },
    { id: 'toeR', parent: 'footR', shape: 'sphere', size: [1], stretch: [0.08, 0.04, 0.03], position: [0, -0.01, 0.245], finish: 'pad', slot: 'pad' },
    { id: 'tail', parent: 'body', role: 'tail', shape: 'sphere', size: [1], stretch: [0.11, 0.11, 0.11], position: [0, -0.3, -0.45], offset: [0, 0, -0.04], finish: 'surface', slot: 'body', furry: true },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Coat', swatches: ['#f6f3ee', '#e9dcc9', '#d7e3f4', '#cfc3b2', '#b9b4ac', '#3a3a40'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#5b3b2a', '#2d7bd6', '#3c8a6a', '#8a5a2a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f2a9a0', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'earInner', label: 'Inner ears', swatches: ['#efb7ac', '#f4c9d4', '#d7b5f0', '#b5d9f0', '#f1d9a8', '#8f8f98'] },
      { slot: 'pad', label: 'Paw pads', swatches: ['#4a3a38', '#7a4a4a', '#2f3440', '#8f6a6a', '#3b5bdb', '#6a3fa0'] },
    ],
    surfaces: ['shortFur', 'furry', 'fuzzy', 'plush', 'wool', 'fleece', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#e8f0fb', '#b8cbe4'],
};
