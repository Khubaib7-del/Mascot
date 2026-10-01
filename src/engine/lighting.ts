import {
  BackSide, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry,
  type Texture, type WebGLRenderer, PMREMGenerator,
} from 'three';
import type { LightingId, Vec3 } from '../mascot/types';

interface Panel { at: Vec3; size: [number, number]; color: string; intensity: number }
interface LightSpec { color: string; intensity: number; at: Vec3 }

/**
 * A lighting preset drives the rig (key/rim/fill), the baked image-based light, exposure, and the
 * colours outdoor worlds use for sky, fog and sun — so one choice re-lights the whole scene.
 */
export interface LightingDef {
  id: LightingId;
  label: string;
  note: string;
  ui: 'light' | 'dark';
  sky: { top: string; horizon: string; ground: string; sun: string; sunAt: Vec3; sunGlow: number };
  fog: string;
  stars: number;
  panels: Panel[];
  envIntensity: number;
  key: LightSpec;
  rim: LightSpec;
  fill: { sky: string; ground: string; intensity: number };
  exposure: number;
  shadow: number;
  furRim: string;
}

export const LIGHTING: Record<LightingId, LightingDef> = {
  studio: {
    id: 'studio', label: 'Studio', note: 'Neutral softboxes', ui: 'light',
    sky: { top: '#d9dde6', horizon: '#f1efe9', ground: '#cfc9bf', sun: '#fff6ea', sunAt: [-0.4, 0.5, 0.8], sunGlow: 0.2 }, fog: '#e6e3dc', stars: 0,
    panels: [
      { at: [-4, 5, 4], size: [4, 4], color: '#ffffff', intensity: 5 },
      { at: [5, 2, 2], size: [3, 4], color: '#eef3ff', intensity: 2.2 },
      { at: [0, 4, -5], size: [5, 2], color: '#ffffff', intensity: 3 },
    ],
    envIntensity: 0.85, key: { color: '#fff6ea', intensity: 2.6, at: [-2.4, 4, 3] }, rim: { color: '#dfe9ff', intensity: 1.6, at: [3, 2.2, -3] },
    fill: { sky: '#ffffff', ground: '#cfcac2', intensity: 0.35 }, exposure: 1.0, shadow: 0.26, furRim: '#ffffff',
  },
  sunset: {
    id: 'sunset', label: 'Warm sunset', note: 'Low golden sun', ui: 'light',
    sky: { top: '#5b6fa8', horizon: '#ffb98a', ground: '#9a6a55', sun: '#ffb070', sunAt: [-0.55, 0.12, 0.8], sunGlow: 1 }, fog: '#f0b894', stars: 0,
    panels: [
      { at: [-5, 1.2, 3], size: [3, 3], color: '#ffa65a', intensity: 9 },
      { at: [5, 4, -2], size: [4, 4], color: '#7f9bdc', intensity: 1.8 },
    ],
    envIntensity: 0.8, key: { color: '#ffae66', intensity: 3.4, at: [-3, 1.9, 2.6] }, rim: { color: '#9fb4ff', intensity: 2.0, at: [3, 2.6, -3] },
    fill: { sky: '#8794c4', ground: '#8a5a45', intensity: 0.35 }, exposure: 1.0, shadow: 0.38, furRim: '#ffc58a',
  },
  morning: {
    id: 'morning', label: 'Cool morning', note: 'Crisp blue light', ui: 'light',
    sky: { top: '#6aa2e8', horizon: '#dcebff', ground: '#b9c9dc', sun: '#fff2dc', sunAt: [0.35, 0.35, 0.85], sunGlow: 0.55 }, fog: '#d8e6f6', stars: 0,
    panels: [
      { at: [4, 4, 4], size: [5, 5], color: '#fff3df', intensity: 5.5 },
      { at: [-5, 3, 2], size: [3, 4], color: '#bcd6ff', intensity: 2.4 },
    ],
    envIntensity: 0.95, key: { color: '#fff1dc', intensity: 3.0, at: [3, 3.6, 2.8] }, rim: { color: '#cde0ff', intensity: 1.8, at: [-3.2, 2.4, -2.8] },
    fill: { sky: '#cfe2ff', ground: '#dfe6ee', intensity: 0.5 }, exposure: 1.0, shadow: 0.26, furRim: '#eaf3ff',
  },
  night: {
    id: 'night', label: 'Night', note: 'Moonlit, cold shadows', ui: 'dark',
    sky: { top: '#060912', horizon: '#1d2a4a', ground: '#0a0d16', sun: '#b9c8ff', sunAt: [0.5, 0.45, -0.6], sunGlow: 0.5 }, fog: '#10172b', stars: 1,
    panels: [
      { at: [4, 5, -2], size: [2, 2], color: '#aec4ff', intensity: 6 },
      { at: [-4, 2, 3], size: [3, 3], color: '#46537f', intensity: 1.2 },
    ],
    envIntensity: 0.4, key: { color: '#aabfff', intensity: 2.0, at: [3, 3.8, 1.8] }, rim: { color: '#ffd9a8', intensity: 1.8, at: [-3, 2.4, -3] },
    fill: { sky: '#26325a', ground: '#07080d', intensity: 0.25 }, exposure: 1.05, shadow: 0.5, furRim: '#a8c1ff',
  },
  cinematic: {
    id: 'cinematic', label: 'Cinematic', note: 'Warm key, teal shadows', ui: 'dark',
    sky: { top: '#16202e', horizon: '#3b4a5c', ground: '#0d1015', sun: '#ffd9a8', sunAt: [-0.5, 0.2, 0.6], sunGlow: 0.6 }, fog: '#1d2733', stars: 0.2,
    panels: [
      { at: [-3, 4, 3], size: [2, 5], color: '#ffe9cc', intensity: 9 },
      { at: [4, 2, -4], size: [2, 4], color: '#6f8fff', intensity: 3.5 },
    ],
    envIntensity: 0.4, key: { color: '#ffe3bf', intensity: 4.2, at: [-2.6, 3.8, 2.4] }, rim: { color: '#7da0ff', intensity: 3.6, at: [2.6, 2.4, -3.2] },
    fill: { sky: '#202738', ground: '#0a0a0c', intensity: 0.12 }, exposure: 1.05, shadow: 0.55, furRim: '#a8c1ff',
  },
  dramatic: {
    id: 'dramatic', label: 'Dramatic', note: 'Hard side light', ui: 'dark',
    sky: { top: '#1a1b22', horizon: '#4a4350', ground: '#0a0a0d', sun: '#fff0dd', sunAt: [-0.8, 0.25, 0.3], sunGlow: 0.4 }, fog: '#2a2830', stars: 0,
    panels: [{ at: [-6, 2, 1], size: [2, 5], color: '#fff2e0', intensity: 12 }, { at: [5, 1, -3], size: [1.5, 3], color: '#8aa0ff', intensity: 3 }],
    envIntensity: 0.3, key: { color: '#fff0dd', intensity: 5.2, at: [-4, 2.2, 1.2] }, rim: { color: '#8fa7ff', intensity: 2.4, at: [3, 2, -3] },
    fill: { sky: '#1a1c28', ground: '#050506', intensity: 0.08 }, exposure: 1.08, shadow: 0.6, furRim: '#ffd9b0',
  },
  soft: {
    id: 'soft', label: 'Soft', note: 'Overcast, airy', ui: 'light',
    sky: { top: '#e9edf3', horizon: '#f6f4f0', ground: '#dcd8d0', sun: '#ffffff', sunAt: [0, 0.8, 0.5], sunGlow: 0.1 }, fog: '#eeeceb', stars: 0,
    panels: [
      { at: [0, 6, 1], size: [8, 8], color: '#ffffff', intensity: 3.2 },
      { at: [-5, 2, 3], size: [3, 4], color: '#fff6f0', intensity: 2 },
      { at: [5, 2, 3], size: [3, 4], color: '#eef4ff', intensity: 2 },
    ],
    envIntensity: 1.05, key: { color: '#fff9f3', intensity: 1.7, at: [-2, 4.2, 3] }, rim: { color: '#eaf1ff', intensity: 1.0, at: [3, 2.4, -3] },
    fill: { sky: '#ffffff', ground: '#e2ded7', intensity: 0.65 }, exposure: 1.02, shadow: 0.16, furRim: '#ffffff',
  },
  fantasy: {
    id: 'fantasy', label: 'Fantasy', note: 'Violet dusk, magic glow', ui: 'light',
    sky: { top: '#6d5bd0', horizon: '#ffb6d9', ground: '#7a5aa8', sun: '#ffd1f0', sunAt: [0.2, 0.2, 0.9], sunGlow: 0.9 }, fog: '#e6b8e6', stars: 0.35,
    panels: [
      { at: [-4, 4, 3], size: [4, 4], color: '#ffc4ec', intensity: 5 },
      { at: [5, 3, 2], size: [3, 4], color: '#a9c4ff', intensity: 3.5 },
      { at: [0, 5, -4], size: [5, 2], color: '#d7b8ff', intensity: 4 },
    ],
    envIntensity: 0.95, key: { color: '#ffd7f2', intensity: 2.6, at: [-2.6, 3.4, 3] }, rim: { color: '#9ec4ff', intensity: 2.6, at: [3, 2.6, -3] },
    fill: { sky: '#c8a8ff', ground: '#8a6ac0', intensity: 0.5 }, exposure: 1.02, shadow: 0.3, furRim: '#ffe0fa',
  },
  neon: {
    id: 'neon', label: 'Neon', note: 'Magenta / cyan arcade', ui: 'dark',
    sky: { top: '#0b0720', horizon: '#3b1560', ground: '#08060f', sun: '#ff4fd8', sunAt: [-0.4, 0.2, 0.7], sunGlow: 0.8 }, fog: '#1a0c33', stars: 0.4,
    panels: [
      { at: [-4, 2, 3], size: [2, 5], color: '#ff3fd0', intensity: 9 },
      { at: [4, 2, 3], size: [2, 5], color: '#2fe6ff', intensity: 9 },
    ],
    envIntensity: 0.55, key: { color: '#ff7fe0', intensity: 3.2, at: [-3, 2.6, 2.4] }, rim: { color: '#37e8ff', intensity: 4.2, at: [3, 2.4, -2.6] },
    fill: { sky: '#3a1d6a', ground: '#07050c', intensity: 0.16 }, exposure: 1.05, shadow: 0.5, furRim: '#7ff0ff',
  },
  snowy: {
    id: 'snowy', label: 'Snowy', note: 'Blue shadows, bright bounce', ui: 'light',
    sky: { top: '#7fb0ea', horizon: '#eaf3ff', ground: '#eef3f9', sun: '#fff7e8', sunAt: [-0.35, 0.4, 0.85], sunGlow: 0.6 }, fog: '#e4eefb', stars: 0,
    panels: [
      { at: [-4, 4, 4], size: [5, 5], color: '#fff6e6', intensity: 5 },
      { at: [0, -2, 3], size: [8, 3], color: '#f2f7ff', intensity: 3.2 },
      { at: [5, 3, 0], size: [3, 4], color: '#b9d3ff', intensity: 2.4 },
    ],
    envIntensity: 1.0, key: { color: '#fff4e0', intensity: 2.8, at: [-2.8, 3.6, 3] }, rim: { color: '#c8defe', intensity: 1.8, at: [3, 2.4, -3] },
    fill: { sky: '#d3e4ff', ground: '#f2f6fb', intensity: 0.6 }, exposure: 1.0, shadow: 0.26, furRim: '#eaf4ff',
  },
  indoor: {
    id: 'indoor', label: 'Indoor', note: 'Lamp and screen glow', ui: 'dark',
    sky: { top: '#24262e', horizon: '#3a3430', ground: '#15130f', sun: '#ffc27a', sunAt: [-0.4, 0.2, 0.8], sunGlow: 0.2 }, fog: '#2a2622', stars: 0,
    panels: [
      { at: [-3, 2.2, 3], size: [2, 2], color: '#ffb866', intensity: 8 },
      { at: [3, 1.6, 3], size: [3, 2], color: '#7fb4ff', intensity: 3.2 },
    ],
    envIntensity: 0.6, key: { color: '#ffbd78', intensity: 3.0, at: [-2.8, 2.6, 2.6] }, rim: { color: '#7fb4ff', intensity: 2.4, at: [3, 2.2, -2.4] },
    fill: { sky: '#5a5f78', ground: '#26201a', intensity: 0.3 }, exposure: 1.04, shadow: 0.42, furRim: '#ffd2a0',
  },
};

export const LIGHTING_IDS = Object.keys(LIGHTING) as LightingId[];

/** Bakes a lighting preset's softbox layout into a PMREM cube for image-based lighting. No HDRI files are shipped. */
export function buildEnvironmentTexture(renderer: WebGLRenderer, env: LightingDef): { texture: Texture; dispose: () => void } {
  const scene = new Scene();
  const sky = new Mesh(
    new SphereGeometry(40, 32, 16),
    new ShaderMaterial({
      side: BackSide, depthWrite: false,
      uniforms: { top: { value: new Color(env.sky.top) }, bottom: { value: new Color(env.sky.ground) }, mid: { value: new Color(env.sky.horizon) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float y = normalize(vP).y; vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.8, y)) : mix(mid, bottom, smoothstep(0.0, -0.4, y)); gl_FragColor = vec4(c, 1.0); }',
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
