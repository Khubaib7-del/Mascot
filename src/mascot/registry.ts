import type { MascotDefinition } from './types';
import { floe } from './definitions/floe';
import { alma } from './definitions/alma';
import { lumi } from './definitions/lumi';
import { orbit } from './definitions/orbit';

/** Adding a mascot = adding a definition here (or, later, fetching it from a catalog endpoint). */
export const MASCOTS: MascotDefinition[] = [floe, alma, lumi, orbit];
export const getMascot = (id: string) => MASCOTS.find((m) => m.id === id);
export const FAMILIES = Array.from(new Set(MASCOTS.map((m) => m.family)));
