import type { MascotDefinition } from './types';
import { moss } from './definitions/moss';
import { pip } from './definitions/pip';
import { orbit } from './definitions/orbit';

/** Adding a mascot = adding a definition here (or, later, fetching it from a catalog endpoint). */
export const MASCOTS: MascotDefinition[] = [moss, pip, orbit];
export const getMascot = (id: string) => MASCOTS.find((m) => m.id === id);

export const FAMILIES = Array.from(new Set(MASCOTS.map((m) => m.family)));
