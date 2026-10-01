import type { MascotDefinition, PartDef } from '../types';
import { face, mirror } from './helpers';

const ear: PartDef = {
  id: 'earL', parent: 'head', role: 'earL', shape: 'sphere', size: [1], stretch: [0.15, 0.15, 0.08],
  position: [0.37, 0.7, -0.02], rotation: [0, 0, -0.35], offset: [0, 0.04, 0], finish: 'surface', slot: 'body', furry: true, hit: true,
  markings: { slot: 'marking', kind: 'patches', scale: 1.3, coverage: 1, size: 0.5 },
};
const arm: PartDef = {
  id: 'armL', parent: 'body', role: 'armL', shape: 'capsule', size: [0.09, 0.2],
  position: [0.4, 0.3, 0.05], rotation: [0, 0, 0.18], offset: [0, -0.18, 0], finish: 'surface', slot: 'body', furry: true,
  markings: { slot: 'marking', kind: 'spots', scale: 11, coverage: 0.3, size: 0.32, seed: 3 },
};
const foot: PartDef = {
  id: 'footL', parent: 'root', role: 'footL', shape: 'sphere', size: [1], stretch: [0.17, 0.11, 0.24],
  position: [0.2, 0.11, 0.15], finish: 'surface', slot: 'body', furry: true,
};
const whisker = (id: string, side: 1 | -1, y: number, rz: number): PartDef => ({
  id, parent: 'head', shape: 'capsule', size: [0.004, 0.26], axis: 'x', position: [side * 0.3, 0.19 + y, 0.45], rotation: [0, side * 0.25, side * rz], offset: [side * 0.12, 0, 0], finish: 'matte', color: '#f4f1ec',
});

export const lumi: MascotDefinition = {
  id: 'lumi',
  name: 'Lumi',
  species: 'Snow leopard cub',
  tagline: 'Quick, quiet and always one step ahead of the build.',
  family: 'Soft & furry',
  personality: ['Focused', 'Playful', 'Precise'],
  description: 'Lumi has a short, close coat with directional lean, painted rosettes along the tail and flank, whiskers and ice-blue eyes. A lithe body and heavy tail give the animator more to do than any other character.',
  signature: { accessory: 'headphones', charms: ['terminal', 'branch', 'bolt'], state: 'coding', expression: 'focused' },
  status: 'prototype',
  source: { type: 'procedural' },
  license: { holder: 'Mascot project', terms: 'Original design, project-owned', assets: 'Procedurally generated — no third-party assets' },
  thumbnail: '/thumbs/lumi.webp',
  palette: { body: '#f1ece3', accent: '#f8f4ec', eye: '#47c1d1', eye2: '#47c1d1', cheek: '#f2b0a8', brow: '#6a6a72', earInner: '#efb7ac', pad: '#5a5560', nose: '#8d6a66', marking: '#8c919b' },
  defaults: { surface: 'shortFur', expression: 'happy', lighting: 'indoor', world: 'devDesk', camera: 'hero' },
  framing: { height: 2.1, center: [0, 0.98, 0] },
  fur: { length: 0.85, density: 1.25, fluff: 0.35, softness: 0.5, gravity: 0.8, variation: 0.45 },
  face: { eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1 },
  sitDrop: 0.2,
  attach: {
    head: { parent: 'head', position: [0, 0.3, 0], scale: 0.55 },
    face: { parent: 'head', position: [0, 0.3, 0.52], scale: 0.19 },
    neck: { parent: 'body', position: [0, 0.4, 0.03], scale: 0.34 },
    chest: { parent: 'body', position: [0.17, 0.1, 0.37], rotation: [0, 0.4, 0], scale: 0.085 },
    back: { parent: 'body', position: [0, 0.08, -0.36], scale: 0.4 },
    handR: { parent: 'armR', position: [0, -0.36, 0.05] },
    handL: { parent: 'armL', position: [0, -0.36, 0.05] },
    charmRail: { parent: 'body', position: [0, -0.2, 0.39], scale: 0.11 },
  },
  parts: [
    {
      id: 'body', parent: 'root', role: 'body', shape: 'sphere', size: [1], stretch: [0.4, 0.5, 0.38], position: [0, 0.64, 0], finish: 'surface', slot: 'body', furry: true, hit: true,
      markings: { slot: 'marking', kind: 'spots', scale: 8, coverage: 0.32, size: 0.34, seed: 1 },
    },
    {
      id: 'head', parent: 'root', role: 'head', shape: 'sphere', size: [1], stretch: [0.53, 0.46, 0.48], position: [0, 1.06, 0], offset: [0, 0.3, 0.02],
      finish: 'surface', slot: 'body', furry: true, hit: true, furMask: { center: [0, -0.12, 0.4], radii: [0.38, 0.34, 0.28] },
      markings: { slot: 'marking', kind: 'spots', scale: 10, coverage: 0.26, size: 0.3, seed: 5 },
    },
    { id: 'muzzle', parent: 'head', shape: 'sphere', size: [1], stretch: [0.19, 0.14, 0.13], position: [0, 0.17, 0.42], finish: 'surface', slot: 'accent', furry: true, fur: { length: 0.5 } },
    ear, mirror(ear, 'earR', 'earR'),
    { id: 'earInnerL', parent: 'earL', shape: 'sphere', size: [1], stretch: [0.09, 0.09, 0.035], position: [0, 0.03, 0.06], finish: 'matte', slot: 'earInner' },
    { id: 'earInnerR', parent: 'earR', shape: 'sphere', size: [1], stretch: [0.09, 0.09, 0.035], position: [0, 0.03, 0.06], finish: 'matte', slot: 'earInner' },
    ...face({
      parent: 'head', eyeAt: [0.185, 0.3, 0.44], eyeSize: [0.085, 0.1, 0.048], irisSize: [0.07, 0.085, 0.03],
      mouthAt: [0, 0.165, 0.543], mouthRadius: 0.06, cheekAt: [0.34, 0.16, 0.34], cheekSize: [0.075, 0.05, 0.015], browAt: [0.185, 0.47, 0.425],
    }),
    { id: 'nose', parent: 'head', shape: 'sphere', size: [1], stretch: [0.058, 0.04, 0.036], position: [0, 0.245, 0.542], finish: 'gloss', slot: 'nose' },
    whisker('whiskA', 1, 0.0, -0.1), whisker('whiskB', 1, 0.04, 0.12), whisker('whiskC', 1, -0.04, -0.3),
    whisker('whiskD', -1, 0.0, -0.1), whisker('whiskE', -1, 0.04, 0.12), whisker('whiskF', -1, -0.04, -0.3),
    arm, mirror(arm, 'armR', 'armR'),
    { id: 'padL', parent: 'armL', shape: 'sphere', size: [1], stretch: [0.055, 0.06, 0.02], position: [0, -0.32, 0.085], finish: 'pad', slot: 'pad' },
    { id: 'padR', parent: 'armR', shape: 'sphere', size: [1], stretch: [0.055, 0.06, 0.02], position: [0, -0.32, 0.085], finish: 'pad', slot: 'pad' },
    foot, mirror(foot, 'footR', 'footR'),
    // Two-segment tail: the child segment curls upward and follows the first with the spring lag.
    {
      id: 'tail', parent: 'body', role: 'tail', shape: 'capsule', size: [0.1, 0.5], position: [0, -0.22, -0.32], rotation: [-1.15, 0, 0], offset: [0, 0.3, 0],
      finish: 'surface', slot: 'body', furry: true, markings: { slot: 'marking', kind: 'rosettes', scale: 5, coverage: 0.55, size: 0.38, seed: 2 },
    },
    {
      id: 'tail2', parent: 'tail', shape: 'capsule', size: [0.096, 0.36], position: [0, 0.62, 0], rotation: [1.0, 0, 0], offset: [0, 0.2, 0],
      finish: 'surface', slot: 'body', furry: true, markings: { slot: 'marking', kind: 'rosettes', scale: 5, coverage: 0.55, size: 0.38, seed: 9 },
    },
    { id: 'tailTip', parent: 'tail2', shape: 'sphere', size: [1], stretch: [0.1, 0.09, 0.1], position: [0, 0.42, 0], finish: 'surface', slot: 'marking', furry: true },
  ],
  customization: {
    colors: [
      { slot: 'body', label: 'Coat', swatches: ['#f1ece3', '#e5ddd0', '#d7e3f4', '#d9c3a4', '#bfc4cc', '#3a3a40'] },
      { slot: 'marking', label: 'Markings', swatches: ['#8c919b', '#5a5f6a', '#b79a74', '#3a3a40', '#6a8fc9', '#a06ac9'] },
      { slot: 'eye', label: 'Eyes', swatches: ['#47c1d1', '#2d7bd6', '#3c8a6a', '#c98a2a', '#6a3fa0', '#1b1b22'] },
      { slot: 'cheek', label: 'Blush', swatches: ['#f2b0a8', '#f4b9c8', '#ffcf9e', '#e98a86', '#d7b5f0', '#b5d9f0'] },
      { slot: 'pad', label: 'Paw pads', swatches: ['#5a5560', '#7a4a4a', '#2f3440', '#8f6a6a', '#3b5bdb', '#6a3fa0'] },
    ],
    surfaces: ['shortFur', 'furry', 'fuzzy', 'plush', 'wool', 'fleece', 'velvet', 'smooth', 'matte', 'rubber', 'glossy', 'synthetic', 'metallic', 'translucent'],
  },
  animations: ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'sleep', 'celebrate', 'point'],
  swatch: ['#e9eef5', '#bcc6d4'],
};
