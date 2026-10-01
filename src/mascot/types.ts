export type Vec3 = [number, number, number];

/** Animation anchors. A part that declares a role is driven by the generic animator. */
export type Role =
  | 'root' | 'body' | 'head' | 'armL' | 'armR' | 'earL' | 'earR' | 'tail'
  | 'eyeL' | 'eyeR' | 'mouth' | 'mouthOpen' | 'browL' | 'browR' | 'cheekL' | 'cheekR' | 'antenna';

export type SurfaceId = 'smooth' | 'plush' | 'fuzzy' | 'furry' | 'synthetic' | 'metallic';
export type ExpressionId = 'neutral' | 'happy' | 'excited' | 'sleepy' | 'curious' | 'surprised' | 'focused';
export type ClipId = 'wave' | 'bounce' | 'dance' | 'curious' | 'excited' | 'think' | 'sleep' | 'celebrate' | 'poke';
export type CameraPresetId = 'hero' | 'portrait' | 'threeQuarter' | 'closeUp' | 'fullBody' | 'cinematic' | 'inspection';
export type EnvironmentId = 'studio' | 'daylight' | 'warmRoom' | 'cinematic' | 'pastel' | 'rim';

/**
 * How a part is shaded.
 * surface — follows the user-selectable surface (fur, plush, vinyl, metal…)
 * matte/gloss — fixed material tinted by a colour slot
 * iris/glow — eye materials tinted by a colour slot
 * eye/inner/highlight — fixed look, uses `color` where given
 */
export type Finish = 'surface' | 'matte' | 'gloss' | 'iris' | 'glow' | 'eye' | 'highlight' | 'inner';

export type Shape = 'sphere' | 'dome' | 'capsule' | 'cone' | 'ring' | 'smile';

export interface PartDef {
  id: string;
  parent?: string;
  role?: Role;
  shape: Shape;
  /** sphere/dome: [radius]; capsule: [radius, length]; cone: [radius, height]; ring/smile: [radius, tube] */
  size: number[];
  /** Non-uniform scale baked into the geometry (so normals stay correct for fur extrusion). */
  stretch?: Vec3;
  /** Capsule axis. */
  axis?: 'x' | 'y';
  /** Pivot position, relative to parent pivot. */
  position?: Vec3;
  rotation?: Vec3;
  /** Mesh centre relative to its own pivot. */
  offset?: Vec3;
  finish: Finish;
  slot?: string;
  color?: string;
  furry?: boolean;
  /** Ellipsoid (in geometry space) where fur fades to bare skin — keeps faces readable. */
  furMask?: { center: Vec3; radii: Vec3 };
  /** Only visible when this accessory is enabled. */
  accessory?: string;
  hit?: boolean;
}

export interface ColorControl { slot: string; label: string; swatches: string[] }
export interface AccessoryDef { id: string; label: string }

export interface MascotDefinition {
  id: string;
  name: string;
  tagline: string;
  family: string;
  description: string;
  status: 'prototype' | 'production';
  /** Source of the geometry. `glb` is the production path; `procedural` is the prototype path. */
  source: { type: 'procedural' } | { type: 'glb'; url: string; draco?: boolean; meshopt?: boolean; ktx2?: boolean };
  license: { holder: string; terms: string; assets: string };
  thumbnail: string;
  surfaceThumbs?: Partial<Record<SurfaceId, string>>;
  palette: Record<string, string>;
  defaults: { surface: SurfaceId; expression: ExpressionId; environment: EnvironmentId; camera: CameraPresetId };
  framing: { height: number; center: Vec3 };
  parts: PartDef[];
  customization: {
    colors: ColorControl[];
    surfaces: SurfaceId[];
    accessories: AccessoryDef[];
  };
  animations: ClipId[];
  environments: EnvironmentId[];
  /** Tint used by cards and posters before the 3D scene is ready. */
  swatch: [string, string];
}

export interface MascotConfig {
  colors: Record<string, string>;
  surface: SurfaceId;
  accessories: string[];
  expression: ExpressionId;
  environment: EnvironmentId;
  camera: CameraPresetId;
}
