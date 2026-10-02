import type { SurfaceId } from '../mascot/types';

export interface FurSpec {
  layers: number;
  /** Shell extrusion in world units (mascots are ~2 units tall). */
  length: number;
  /** Strand cells per world unit. */
  density: number;
  /** 0..1 root darkening (fake ambient occlusion inside the coat). */
  rootDark: number;
  rim: number;
  gravity: number;
  /** Tuft convergence: how strongly strands lean together toward their tuft centre. */
  clump: number;
  /** Tuft size: coarse-lattice cells per strand cell (smaller = bigger tufts). */
  tuft: number;
  /** Strand thickness as a fraction of its lattice cell. */
  thickness: number;
  /** How far strands sweep along the flow direction (0 = standing up, 1 = lying down). */
  bend: number;
  /** Helical offset for wool ringlets. */
  curl: number;
  /** Fraction of long flyaway strands that fuzz the silhouette. */
  wisp: number;
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
const fur = (f: Partial<FurSpec> & Pick<FurSpec, 'layers' | 'length' | 'density'>): FurSpec =>
  ({ rootDark: 0.3, rim: 0.6, gravity: 0, clump: 0.5, tuft: 0.14, thickness: 0.42, bend: 0.5, curl: 0, wisp: 0.04, ...f });

export const SURFACES: Record<SurfaceId, SurfaceDef> = {
  smooth: { id: 'smooth', label: 'Smooth', note: 'Soft-touch vinyl', ...base, roughness: 0.58, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.4, sheenRoughness: 0.6 },
  plush: { id: 'plush', label: 'Plush', note: 'Brushed fabric nap', ...base, roughness: 0.92, fur: fur({ layers: 14, length: 0.02, density: 190, rootDark: 0.2, rim: 0.5, clump: 0.2, thickness: 0.5, bend: 0.2, wisp: 0.015 }) },
  fuzzy: { id: 'fuzzy', label: 'Fuzzy', note: 'Short peach-fuzz pile', ...base, roughness: 0.95, fur: fur({ layers: 22, length: 0.03, density: 230, rootDark: 0.28, clump: 0.45, bend: 0.45, wisp: 0.04 }) },
  shortFur: { id: 'shortFur', label: 'Short fur', note: 'Dense, close coat', ...base, roughness: 0.95, fur: fur({ layers: 30, length: 0.04, density: 260, rootDark: 0.3, rim: 0.7, gravity: 0.004, clump: 0.6, thickness: 0.46, bend: 0.7, wisp: 0.04 }) },
  furry: { id: 'furry', label: 'Long fur', note: 'Deep, combed fur', ...base, roughness: 0.95, fur: fur({ layers: 40, length: 0.11, density: 150, rootDark: 0.34, rim: 0.8, gravity: 0.02, clump: 0.7, tuft: 0.12, thickness: 0.4, bend: 1.0, wisp: 0.07 }) },
  wool: { id: 'wool', label: 'Wool', note: 'Curled, springy fibres', ...base, roughness: 1, fur: fur({ layers: 36, length: 0.085, density: 95, rootDark: 0.3, rim: 0.65, gravity: 0.006, clump: 0.9, tuft: 0.2, thickness: 0.58, bend: 0.15, curl: 1.25, wisp: 0.03 }) },
  fleece: { id: 'fleece', label: 'Fleece', note: 'Soft synthetic pile', ...base, roughness: 0.9, sheen: 0.3, sheenRoughness: 0.5, fur: fur({ layers: 18, length: 0.028, density: 190, rootDark: 0.18, rim: 0.5, clump: 0.3, thickness: 0.52, bend: 0.3, wisp: 0.02 }) },
  velvet: { id: 'velvet', label: 'Velvet', note: 'Edge-lit sheen, no strands', ...base, roughness: 0.8, sheen: 1, sheenRoughness: 0.35 },
  matte: { id: 'matte', label: 'Matte', note: 'Chalky clay', ...base, roughness: 1 },
  rubber: { id: 'rubber', label: 'Rubber', note: 'Squishy toy rubber', ...base, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 },
  glossy: { id: 'glossy', label: 'Glossy', note: 'Lacquered', ...base, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 },
  synthetic: { id: 'synthetic', label: 'Synthetic', note: 'Coated polymer', ...base, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 },
  metallic: { id: 'metallic', label: 'Metallic', note: 'Anodised metal', ...base, metalness: 1, roughness: 0.28, clearcoat: 0.3, clearcoatRoughness: 0.2 },
  translucent: { id: 'translucent', label: 'Translucent', note: 'Frosted gel', ...base, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.1, transmission: 0.55, opacity: 0.92 },
};

export const SURFACE_IDS = Object.keys(SURFACES) as SurfaceId[];
