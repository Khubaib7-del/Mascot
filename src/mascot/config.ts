import { DEFAULT_PARAMS, type MascotConfig, type MascotDefinition, type Params } from './types';
import { ACCESSORIES } from '../engine/accessories';
import { CHARMS } from '../engine/charms';
import { LIGHTING_IDS } from '../engine/lighting';
import { WORLD_IDS } from '../engine/worlds';
import { AGENT_STATES } from '../engine/agent';
import { EXPRESSIONS } from '../engine/animation/expressions';
import { CAMERA_PRESETS } from '../engine/camera';
import { SURFACES } from '../engine/surfaces';
import { ACCESSORY_COLORS } from '../engine/accessories';

export const MAX_CHARMS = 6;

export function defaultConfig(def: MascotDefinition): MascotConfig {
  return {
    colors: { ...ACCESSORY_COLORS, ...def.palette },
    surface: def.defaults.surface,
    accessories: [],
    charms: [],
    expression: def.defaults.expression,
    lighting: def.defaults.lighting,
    world: def.defaults.world,
    camera: def.defaults.camera,
    agent: 'idle',
    params: { ...DEFAULT_PARAMS },
  };
}

/** The look a collection card shows: the character's signature outfit, state and expression. */
export function signatureConfig(def: MascotDefinition): MascotConfig {
  return {
    ...defaultConfig(def),
    accessories: [def.signature.accessory],
    charms: def.signature.charms ?? [],
    expression: def.signature.expression,
    agent: def.signature.state,
  };
}

const hex = /^#[0-9a-f]{6}$/i;
const inList = <T extends string>(v: unknown, ok: readonly T[]): v is T => typeof v === 'string' && (ok as readonly string[]).includes(v);

/** Merges untrusted input (URL, localStorage) into a valid config for this mascot. */
export function sanitizeConfig(def: MascotDefinition, input: unknown): MascotConfig {
  const base = defaultConfig(def);
  if (!input || typeof input !== 'object') return base;
  const c = input as Partial<MascotConfig>;
  if (c.colors && typeof c.colors === 'object') {
    for (const k of Object.keys(base.colors)) {
      const v = (c.colors as Record<string, unknown>)[k];
      if (typeof v === 'string' && hex.test(v)) base.colors[k] = v;
    }
  }
  if (inList(c.surface, def.customization.surfaces)) base.surface = c.surface;
  const compatible = (id: string) => ACCESSORIES[id]?.attach.every((a) => !!def.attach[a]);
  if (Array.isArray(c.accessories)) base.accessories = c.accessories.filter((a) => typeof a === 'string' && compatible(a));
  if (Array.isArray(c.charms)) base.charms = c.charms.filter((a) => typeof a === 'string' && a in CHARMS).slice(0, MAX_CHARMS);
  if (inList(c.expression, Object.keys(EXPRESSIONS) as never[])) base.expression = c.expression;
  if (inList(c.lighting, LIGHTING_IDS)) base.lighting = c.lighting;
  if (inList(c.world, WORLD_IDS)) base.world = c.world;
  if (inList(c.camera, Object.keys(CAMERA_PRESETS) as never[])) base.camera = c.camera;
  if (inList(c.agent, Object.keys(AGENT_STATES) as never[])) base.agent = c.agent;
  if (c.params && typeof c.params === 'object') {
    for (const k of Object.keys(DEFAULT_PARAMS) as (keyof Params)[]) {
      const v = (c.params as unknown as Record<string, unknown>)[k];
      if (typeof v === 'number' && Number.isFinite(v)) base.params[k] = Math.min(4, Math.max(0, v));
    }
  }
  void SURFACES;
  return base;
}

export const encodeConfig = (c: MascotConfig) =>
  btoa(JSON.stringify(c)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function decodeConfig(def: MascotDefinition, s: string | null): MascotConfig | null {
  if (!s) return null;
  try {
    return sanitizeConfig(def, JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  } catch {
    return null;
  }
}
