import type { MascotConfig, MascotDefinition } from './types';

export function defaultConfig(def: MascotDefinition): MascotConfig {
  return {
    colors: { ...def.palette },
    surface: def.defaults.surface,
    accessories: [],
    expression: def.defaults.expression,
    environment: def.defaults.environment,
    camera: def.defaults.camera,
  };
}

/** Merges untrusted input (URL, localStorage) into a valid config for this mascot. */
export function sanitizeConfig(def: MascotDefinition, input: unknown): MascotConfig {
  const base = defaultConfig(def);
  if (!input || typeof input !== 'object') return base;
  const c = input as Partial<MascotConfig>;
  const hex = /^#[0-9a-f]{6}$/i;
  if (c.colors && typeof c.colors === 'object') {
    for (const ctl of def.customization.colors) {
      const v = (c.colors as Record<string, unknown>)[ctl.slot];
      if (typeof v === 'string' && hex.test(v)) base.colors[ctl.slot] = v;
    }
  }
  if (c.surface && def.customization.surfaces.includes(c.surface)) base.surface = c.surface;
  if (Array.isArray(c.accessories)) {
    const ok = new Set(def.customization.accessories.map((a) => a.id));
    base.accessories = c.accessories.filter((a) => ok.has(a));
  }
  if (c.expression) base.expression = c.expression;
  if (c.environment && def.environments.includes(c.environment)) base.environment = c.environment;
  if (c.camera) base.camera = c.camera;
  return base;
}

export const encodeConfig = (c: MascotConfig) =>
  btoa(JSON.stringify(c)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function decodeConfig(def: MascotDefinition, s: string | null): MascotConfig | null {
  if (!s) return null;
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    return sanitizeConfig(def, JSON.parse(atob(b64)));
  } catch {
    return null;
  }
}
