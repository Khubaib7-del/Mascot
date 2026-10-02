import type { BlobSpec } from '../engine/blob';
export type Vec3 = [number, number, number];

/** Animation anchors. A part that declares a role is driven by the generic animator. */
export type Role =
  | 'root' | 'body' | 'head' | 'neck' | 'armL' | 'armR' | 'earL' | 'earR' | 'tail' | 'footL' | 'footR'
  | 'legFL' | 'legFR' | 'legBL' | 'legBR'
  | 'eyeL' | 'eyeR' | 'irisL' | 'irisR' | 'pupilL' | 'pupilR' | 'shineL' | 'shineR'
  | 'mouth' | 'mouthOpen' | 'browL' | 'browR' | 'cheekL' | 'cheekR' | 'antenna' | 'topknot';

export type SurfaceId =
  | 'smooth' | 'plush' | 'fuzzy' | 'shortFur' | 'furry' | 'wool' | 'fleece' | 'velvet'
  | 'matte' | 'rubber' | 'glossy' | 'synthetic' | 'metallic' | 'translucent';
export type ExpressionId =
  | 'neutral' | 'happy' | 'excited' | 'sleepy' | 'curious' | 'surprised' | 'focused'
  | 'worried' | 'confused' | 'pout' | 'laughing' | 'shocked' | 'talking' | 'relaxed';
export type ClipId =
  | 'wave' | 'bounce' | 'dance' | 'curious' | 'excited' | 'think' | 'sleep' | 'celebrate' | 'poke'
  | 'type' | 'read' | 'write' | 'search' | 'point' | 'confused' | 'wait' | 'sad' | 'sit' | 'carry' | 'gallop';
export type CameraPresetId =
  | 'hero' | 'portrait' | 'threeQuarter' | 'closeUp' | 'fullBody' | 'cinematic' | 'inspection'
  | 'side' | 'rear' | 'lowAngle' | 'highAngle';
export type LightingId =
  | 'studio' | 'sunset' | 'morning' | 'night' | 'cinematic' | 'dramatic' | 'soft' | 'fantasy' | 'neon' | 'snowy' | 'indoor';
export type WorldId = 'mountain' | 'studio' | 'devDesk' | 'space' | 'forest' | 'fantasy' | 'city' | 'beach' | 'sky' | 'office';
export type AttachPoint =
  | 'head' | 'face' | 'neck' | 'chest' | 'back' | 'handR' | 'handL' | 'waist' | 'earL' | 'earR' | 'tail' | 'charmRail';
export type AgentStateId =
  | 'idle' | 'thinking' | 'planning' | 'searching' | 'reading' | 'writing' | 'coding' | 'editing' | 'creating'
  | 'deleting' | 'testing' | 'debugging' | 'reviewing' | 'running' | 'installing' | 'compiling' | 'deploying'
  | 'waiting' | 'blocked' | 'successful' | 'failed' | 'learning' | 'researching' | 'processing' | 'responding'
  | 'completed' | 'sleeping' | 'emailing' | 'calculating';

/**
 * How a part is shaded.
 * surface — follows the user-selectable surface (fur, plush, vinyl, metal…)
 * matte/gloss — fixed material tinted by a colour slot
 * iris/glow — eye materials tinted by a colour slot
 * eye/inner/highlight — fixed look, uses `color` where given
 */
export type Finish = 'surface' | 'matte' | 'gloss' | 'iris' | 'glow' | 'eye' | 'sclera' | 'blush' | 'highlight' | 'inner' | 'pad' | 'glass';

export type Shape = 'sphere' | 'dome' | 'capsule' | 'cone' | 'ring' | 'smile' | 'blob' | 'cap' | 'disc' | 'arc' | 'wmouth';

/** Procedural markings painted in object space on fur + skin (spots, rosettes, patches). */
export interface Markings {
  slot: string;
  kind: 'spots' | 'rosettes' | 'patches';
  /** Cells per unit; higher = smaller spots. */
  scale: number;
  /** 0..1 fraction of cells that carry a mark. */
  coverage: number;
  size: number;
  seed?: number;
}

export interface FurMask { center: Vec3; radii: Vec3; /** Fur length multiplier at the centre of the mask (0 = bare). */ fade?: number }

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
  furMask?: FurMask | FurMask[];
  /** Fur flow: gravity by default; radial makes strands sweep away from `origin` (faces). */
  flow?: { radial?: number; origin?: Vec3; bend?: number };
  /** Geometry for shape 'blob'. */
  blob?: BlobSpec;
  /** Per-part multipliers on the character's fur profile (e.g. a fluffier topknot). */
  fur?: { length?: number; density?: number };
  markings?: Markings;
  /** Only visible when this accessory is enabled. */
  accessory?: string;
  hit?: boolean;
  /** Small facial features: no shadow casting or receiving (low-res shadow maps turn them blocky). */
  flat?: boolean;
}

export interface ColorControl { slot: string; label: string; swatches: string[] }

/** Character-level fur personality. Surface presets provide the base; this scales it. */
export interface FurProfile {
  length: number;
  density: number;
  fluff: number;
  softness: number;
  gravity: number;
  variation: number;
}

export interface AttachDef { parent: string; position: Vec3; rotation?: Vec3; scale?: number }

export interface FaceBase {
  eyeSize: number; irisSize: number; pupilSize: number; eyeSpacing: number; highlight: number;
}

export interface MascotDefinition {
  id: string;
  name: string;
  tagline: string;
  family: string;
  description: string;
  species: string;
  personality: string[];
  signature: { accessory: string; charms?: string[]; state: AgentStateId; expression: ExpressionId };
  status: 'prototype' | 'production';
  /** Source of the geometry. `glb` is the production path; `procedural` is the prototype path. */
  source: { type: 'procedural' } | { type: 'glb'; url: string; draco?: boolean; meshopt?: boolean; ktx2?: boolean };
  license: { holder: string; terms: string; assets: string };
  thumbnail: string;
  palette: Record<string, string>;
  defaults: { surface: SurfaceId; expression: ExpressionId; lighting: LightingId; world: WorldId; camera: CameraPresetId };
  framing: { height: number; center: Vec3 };
  fur: FurProfile;
  face: FaceBase;
  /** Where accessories and props attach on this body. Missing points disable compatible items. */
  attach: Partial<Record<AttachPoint, AttachDef>>;
  /** Posture hint for sitting/working states. */
  sitDrop: number;
  /** Quadrupeds reuse biped clips: channels for a missing role are redirected to this one (armL → legFL). */
  roleAliases?: Partial<Record<Role, Role>>;
  /** Proxy spheres (in a part's local space) for contact ambient occlusion. Up to six. */
  occluders?: { role: Role; center: Vec3; r: number }[];
  parts: PartDef[];
  customization: {
    colors: ColorControl[];
    surfaces: SurfaceId[];
  };
  animations: ClipId[];
  /** Tint used by cards and posters before the 3D scene is ready. */
  swatch: [string, string];
}

export interface Params {
  furLength: number; furDensity: number; softness: number; fluffiness: number; furVariation: number;
  furDirection: number; roughness: number; sheen: number;
  eyeSize: number; irisSize: number; pupilSize: number; eyeSpacing: number; highlight: number;
  headSize: number; bodySize: number; motionEnergy: number; animSpeed: number; blinkSpeed: number;
  squint: number; heterochromia: number;
}

export const DEFAULT_PARAMS: Params = {
  furLength: 1, furDensity: 1, softness: 0.5, fluffiness: 0.5, furVariation: 0.5, furDirection: 0.5, roughness: 0.5, sheen: 0.5,
  eyeSize: 1, irisSize: 1, pupilSize: 1, eyeSpacing: 1, highlight: 1,
  headSize: 1, bodySize: 1, motionEnergy: 1, animSpeed: 1, blinkSpeed: 1, squint: 0, heterochromia: 0,
};

export interface AccessorySelection { id: string; colors?: Record<string, string> }

export interface MascotConfig {
  colors: Record<string, string>;
  surface: SurfaceId;
  /** Worn/attached accessories by id. */
  accessories: string[];
  /** Up to six collectible charms hanging from the charm rail. */
  charms: string[];
  expression: ExpressionId;
  lighting: LightingId;
  world: WorldId;
  camera: CameraPresetId;
  agent: AgentStateId;
  params: Params;
}
