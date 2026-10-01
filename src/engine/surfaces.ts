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
  /** 0 = straight shells, 1 = strands lean sideways (lock-like clumping for wool/fluff). */
  clump: number;
  /** Strand thickness as a fraction of its lattice cell. */
  thickness: number;
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
  transmission?: number;
  opacity?: number;
  fur?: FurSpec;
}

const base = { metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, sheenRoughness: 1 };

export const SURFACES: Record<SurfaceId, SurfaceDef> = {
  smooth: { id: 'smooth', label: 'Smooth', note: 'Soft-touch vinyl', ...base, roughness: 0.58, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.4, sheenRoughness: 0.6 },
  plush: { id: 'plush', label: 'Plush', note: 'Brushed fabric nap', ...base, roughness: 0.92, fur: { layers: 10, length: 0.014, density: 92, rootDark: 0.2, rim: 0.55, gravity: 0, clump: 0, thickness: 0.5 } },
  fuzzy: { id: 'fuzzy', label: 'Fuzzy', note: 'Short peach-fuzz pile', ...base, roughness: 0.95, fur: { layers: 16, length: 0.03, density: 105, rootDark: 0.3, rim: 0.7, gravity: 0.004, clump: 0.1, thickness: 0.46 } },
  shortFur: { id: 'shortFur', label: 'Short fur', note: 'Dense, close coat', ...base, roughness: 0.95, fur: { layers: 22, length: 0.045, density: 120, rootDark: 0.34, rim: 0.7, gravity: 0.006, clump: 0.2, thickness: 0.42 } },
  furry: { id: 'furry', label: 'Long fur', note: 'Deep shell fur', ...base, roughness: 0.95, fur: { layers: 30, length: 0.07, density: 88, rootDark: 0.38, rim: 0.8, gravity: 0.014, clump: 0.3, thickness: 0.4 } },
  wool: { id: 'wool', label: 'Wool', note: 'Fluffy, curled fibres', ...base, roughness: 1, fur: { layers: 30, length: 0.085, density: 56, rootDark: 0.3, rim: 0.65, gravity: 0.008, clump: 0.85, thickness: 0.62 } },
  fleece: { id: 'fleece', label: 'Fleece', note: 'Soft synthetic pile', ...base, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.5, fur: { layers: 14, length: 0.022, density: 80, rootDark: 0.18, rim: 0.5, gravity: 0, clump: 0.2, thickness: 0.55 } },
  velvet: { id: 'velvet', label: 'Velvet', note: 'Edge-lit sheen, no strands', ...base, roughness: 0.8, sheen: 1, sheenRoughness: 0.35 },
  matte: { id: 'matte', label: 'Matte', note: 'Chalky clay', ...base, roughness: 1 },
  rubber: { id: 'rubber', label: 'Rubber', note: 'Squishy toy rubber', ...base, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 },
  glossy: { id: 'glossy', label: 'Glossy', note: 'Lacquered', ...base, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 },
  synthetic: { id: 'synthetic', label: 'Synthetic', note: 'Coated polymer', ...base, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 },
  metallic: { id: 'metallic', label: 'Metallic', note: 'Anodised metal', ...base, metalness: 1, roughness: 0.28, clearcoat: 0.3, clearcoatRoughness: 0.2 },
  translucent: { id: 'translucent', label: 'Translucent', note: 'Frosted gel', ...base, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.1, transmission: 0.55, opacity: 0.92 },
};

export const SURFACE_IDS = Object.keys(SURFACES) as SurfaceId[];
