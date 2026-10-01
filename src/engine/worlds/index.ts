import type { WorldId } from '../../mascot/types';
import type { WorldDef } from './common';
import { mountain, forest, fantasy, beach, flight } from './outdoor';
import { studio, devDesk, city, office } from './indoor';
import { space } from './space';

export const WORLDS: Record<WorldId, WorldDef> = { mountain, studio, devDesk, space, forest, fantasy, city, beach, sky: flight, office };
export const WORLD_IDS = Object.keys(WORLDS) as WorldId[];
export type { WorldDef, WorldRuntime, WorldContext } from './common';
