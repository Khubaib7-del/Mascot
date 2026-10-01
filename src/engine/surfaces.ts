import type { SurfaceId } from '../mascot/types';

export interface FurSpec {
  layers: number;
  /** Shell extrusion in world units (mascots are ~1.5 units tall). */
  length: number;
  /** Strand cells per world unit. */
  density: number;
  /** 0..1 root darkening (fake ambient occlusion inside the coat). */
  rootDark: number;
  rim: number;
  gravity: number;
}

export interface SurfaceDef {
  id: SurfaceId;
  label: string;
  note: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  fur?: FurSpec;
}

export const SURFACES: Record<SurfaceId, SurfaceDef> = {
  smooth: { id: 'smooth', label: 'Smooth', note: 'Soft-touch vinyl', roughness: 0.58, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.4, sheenRoughness: 0.6 },
  plush: {
    id: 'plush', label: 'Plush', note: 'Brushed fabric nap', roughness: 0.92, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, sheenRoughness: 1,
    fur: { layers: 10, length: 0.014, density: 92, rootDark: 0.2, rim: 0.55, gravity: 0 },
  },
  fuzzy: {
    id: 'fuzzy', label: 'Fuzzy', note: 'Short peach-fuzz pile', roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, sheenRoughness: 1,
    fur: { layers: 18, length: 0.032, density: 105, rootDark: 0.3, rim: 0.7, gravity: 0.004 },
  },
  furry: {
    id: 'furry', label: 'Furry', note: 'Deep shell fur', roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, sheenRoughness: 1,
    fur: { layers: 30, length: 0.07, density: 88, rootDark: 0.38, rim: 0.8, gravity: 0.014 },
  },
  synthetic: { id: 'synthetic', label: 'Synthetic', note: 'Coated polymer', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0, sheenRoughness: 1 },
  metallic: { id: 'metallic', label: 'Metallic', note: 'Anodised metal', roughness: 0.28, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.2, sheen: 0, sheenRoughness: 1 },
};
