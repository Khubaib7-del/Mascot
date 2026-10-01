import {
  BackSide, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry,
  type Texture, type WebGLRenderer, PMREMGenerator,
} from 'three';
import type { EnvironmentId, Vec3 } from '../mascot/types';

interface Panel { at: Vec3; size: [number, number]; color: string; intensity: number }
interface LightSpec { color: string; intensity: number; at: Vec3 }

export interface EnvironmentDef {
  id: EnvironmentId;
  label: string;
  note: string;
  /** CSS backdrop for the canvas container. */
  bg: [string, string];
  ui: 'light' | 'dark';
  sky: [string, string];
  panels: Panel[];
  envIntensity: number;
  key: LightSpec;
  rim: LightSpec;
  fill: { sky: string; ground: string; intensity: number };
  exposure: number;
  shadow: number;
  /** Colour multiplied into fur rim light. */
  furRim: string;
}

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentDef> = {
  studio: {
    id: 'studio', label: 'Studio', note: 'Neutral softboxes', bg: ['#eceae6', '#d4d2cd'], ui: 'light', sky: ['#f2f2f2', '#9a9a9a'],
    panels: [
      { at: [-4, 5, 4], size: [4, 4], color: '#ffffff', intensity: 5 },
      { at: [5, 2, 2], size: [3, 4], color: '#eef3ff', intensity: 2.2 },
      { at: [0, 4, -5], size: [5, 2], color: '#ffffff', intensity: 3 },
    ],
    envIntensity: 0.85, key: { color: '#fff6ea', intensity: 2.6, at: [-2.4, 4, 3] }, rim: { color: '#dfe9ff', intensity: 1.6, at: [3, 2.2, -3] },
    fill: { sky: '#ffffff', ground: '#cfcac2', intensity: 0.35 }, exposure: 1.0, shadow: 0.26, furRim: '#ffffff',
  },
  daylight: {
    id: 'daylight', label: 'Daylight', note: 'Soft window light', bg: ['#f7f1e6', '#e4ddcf'], ui: 'light', sky: ['#cfe3ff', '#e8dfcf'],
    panels: [
      { at: [-5, 4, 3], size: [5, 5], color: '#fff3dc', intensity: 6 },
      { at: [4, 3, 3], size: [3, 4], color: '#cfe0ff', intensity: 1.6 },
    ],
    envIntensity: 0.95, key: { color: '#fff1d6', intensity: 3.0, at: [-3, 3.6, 2.6] }, rim: { color: '#d6e6ff', intensity: 1.8, at: [3.2, 2.4, -2.8] },
    fill: { sky: '#dce9ff', ground: '#e8dcc6', intensity: 0.45 }, exposure: 1.0, shadow: 0.24, furRim: '#fff4de',
  },
  warmRoom: {
    id: 'warmRoom', label: 'Warm room', note: 'Tungsten lamp, dusk window', bg: ['#e9d9c3', '#b99a7a'], ui: 'light', sky: ['#7d8cab', '#6b4a35'],
    panels: [
      { at: [-3, 2.2, 3], size: [2, 2], color: '#ffb866', intensity: 9 },
      { at: [5, 3, -1], size: [3, 5], color: '#8aa4d8', intensity: 1.6 },
    ],
    envIntensity: 0.7, key: { color: '#ffb36b', intensity: 3.2, at: [-3, 2.4, 2.4] }, rim: { color: '#9bb2e8', intensity: 1.8, at: [3, 2.6, -3] },
    fill: { sky: '#7d86a0', ground: '#7a5538', intensity: 0.3 }, exposure: 1.0, shadow: 0.34, furRim: '#ffc58a',
  },
  cinematic: {
    id: 'cinematic', label: 'Cinematic', note: 'Dark stage, single key', bg: ['#1c1d22', '#08080a'], ui: 'dark', sky: ['#0d0e12', '#050506'],
    panels: [
      { at: [-3, 4, 3], size: [2, 5], color: '#ffe9cc', intensity: 9 },
      { at: [4, 2, -4], size: [2, 4], color: '#6f8fff', intensity: 3.5 },
    ],
    envIntensity: 0.4, key: { color: '#ffe3bf', intensity: 4.2, at: [-2.6, 3.8, 2.4] }, rim: { color: '#7da0ff', intensity: 3.6, at: [2.6, 2.4, -3.2] },
    fill: { sky: '#202738', ground: '#0a0a0c', intensity: 0.12 }, exposure: 1.05, shadow: 0.55, furRim: '#a8c1ff',
  },
  pastel: {
    id: 'pastel', label: 'Pastel', note: 'Airy, candy-soft', bg: ['#f9e9ee', '#e3e6f6'], ui: 'light', sky: ['#ffe9f0', '#dfe7ff'],
    panels: [
      { at: [-4, 4, 4], size: [5, 5], color: '#fff0f5', intensity: 4.5 },
      { at: [4, 3, 3], size: [4, 4], color: '#e1ebff', intensity: 3 },
      { at: [0, 5, -4], size: [6, 3], color: '#ffffff', intensity: 2.5 },
    ],
    envIntensity: 1.0, key: { color: '#fff5f0', intensity: 2.2, at: [-2.5, 3.6, 3] }, rim: { color: '#e3ecff', intensity: 1.4, at: [3, 2.4, -3] },
    fill: { sky: '#ffeaf2', ground: '#e1e6fa', intensity: 0.55 }, exposure: 1.02, shadow: 0.18, furRim: '#fff0f6',
  },
  rim: {
    id: 'rim', label: 'Rim light', note: 'Back-lit silhouette', bg: ['#2b2a33', '#121217'], ui: 'dark', sky: ['#14151c', '#07070a'],
    panels: [
      { at: [0, 3.5, -5], size: [7, 3], color: '#ffffff', intensity: 10 },
      { at: [-5, 2, -2], size: [1.5, 4], color: '#ffd9ad', intensity: 6 },
      { at: [5, 2, -2], size: [1.5, 4], color: '#aebfff', intensity: 6 },
    ],
    envIntensity: 0.5, key: { color: '#ffe8cf', intensity: 1.2, at: [-2, 3, 3] }, rim: { color: '#ffffff', intensity: 6.0, at: [0, 3, -3.5] },
    fill: { sky: '#1b1d29', ground: '#09090c', intensity: 0.1 }, exposure: 1.1, shadow: 0.5, furRim: '#ffffff',
  },
};

/** Bakes an environment's softbox layout into a PMREM cube for image-based lighting. No HDRI files are shipped. */
export function buildEnvironmentTexture(renderer: WebGLRenderer, env: EnvironmentDef): { texture: Texture; dispose: () => void } {
  const scene = new Scene();
  const sky = new Mesh(
    new SphereGeometry(40, 32, 16),
    new ShaderMaterial({
      side: BackSide, depthWrite: false,
      uniforms: { top: { value: new Color(env.sky[0]) }, bottom: { value: new Color(env.sky[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = smoothstep(-0.5, 0.8, normalize(vP).y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
    }),
  );
  scene.add(sky);
  const geos: PlaneGeometry[] = [];
  const mats: MeshBasicMaterial[] = [];
  for (const p of env.panels) {
    const g = new PlaneGeometry(p.size[0], p.size[1]);
    const m = new MeshBasicMaterial({ color: new Color(p.color).multiplyScalar(p.intensity), side: DoubleSide, toneMapped: false });
    const mesh = new Mesh(g, m);
    mesh.position.set(...p.at);
    mesh.lookAt(0, 0.8, 0);
    scene.add(mesh);
    geos.push(g); mats.push(m);
  }
  const pmrem = new PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  sky.geometry.dispose(); (sky.material as ShaderMaterial).dispose();
  geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose());
  return { texture: rt.texture, dispose: () => rt.dispose() };
}
