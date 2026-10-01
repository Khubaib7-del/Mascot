export interface Pose { x: number; y: number; z: number; ry: number; scale: number; /** 0..1 how "alive" idle layers are while moving */ }

export type Gait = 'walk' | 'run' | 'hop' | 'fly' | 'float' | null;
export type Easing = 'linear' | 'easeOut' | 'easeInOut' | 'bounce' | 'overshoot';

export interface MovementDef {
  id: string;
  label: string;
  kind: 'entrance' | 'exit' | 'loop';
  duration: number;
  gait: Gait;
  /** u is normalised time 0..1 (loop: wraps), t is seconds. Distances are in mascot-height units. */
  path(u: number, t: number): Partial<Pose>;
}

export const EASE: Record<Easing, (x: number) => number> = {
  linear: (x) => x,
  easeOut: (x) => 1 - Math.pow(1 - x, 3),
  easeInOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  bounce: (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
  overshoot: (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sideWalk(dir: 1 | -1, run = false): MovementDef['path'] {
  const walkEnd = 0.84;
  return (u) => {
    const p = EASE.easeOut(clamp01(u / walkEnd)) * (run ? 1 : 1);
    const turn = EASE.easeInOut(clamp01((u - walkEnd) / (1 - walkEnd)));
    return { x: -dir * 3.4 * (1 - p), ry: lerp(dir * (Math.PI / 2), 0, turn) };
  };
}

export const MOVEMENTS: Record<string, MovementDef> = {
  walkInLeft: { id: 'walkInLeft', label: 'Walk in (left)', kind: 'entrance', duration: 2.8, gait: 'walk', path: sideWalk(1) },
  walkInRight: { id: 'walkInRight', label: 'Walk in (right)', kind: 'entrance', duration: 2.8, gait: 'walk', path: sideWalk(-1) },
  runIn: { id: 'runIn', label: 'Run in', kind: 'entrance', duration: 1.7, gait: 'run', path: sideWalk(1, true) },
  flyIn: { id: 'flyIn', label: 'Fly in', kind: 'entrance', duration: 2.6, gait: 'fly', path: (u) => { const p = EASE.easeOut(u); return { x: 4 * (1 - p), y: 3.2 * (1 - p) + Math.sin(u * 6) * 0.15 * (1 - u), z: -2 * (1 - p), ry: 0 }; } },
  dropIn: { id: 'dropIn', label: 'Drop in', kind: 'entrance', duration: 1.4, gait: null, path: (u) => ({ y: 4.5 * (1 - EASE.bounce(u)) }) },
  peekIn: { id: 'peekIn', label: 'Peek in', kind: 'entrance', duration: 1.8, gait: null, path: (u) => ({ y: -1.3 * (1 - EASE.overshoot(clamp01(u * 1.1))), z: 0.15 * (1 - u) }) },
  jumpIn: { id: 'jumpIn', label: 'Jump in', kind: 'entrance', duration: 2.4, gait: 'hop', path: (u) => { const p = EASE.easeOut(u); return { x: -3.2 * (1 - p), y: Math.abs(Math.sin(u * Math.PI * 3.5)) * 0.55 * (1 - u * 0.7), ry: lerp(Math.PI / 2, 0, EASE.easeInOut(clamp01((u - 0.8) / 0.2))) }; } },
  approach: { id: 'approach', label: 'Approach camera', kind: 'entrance', duration: 3.2, gait: 'walk', path: (u) => ({ z: -7 * (1 - EASE.easeOut(u)), ry: 0 }) },
  floatIn: { id: 'floatIn', label: 'Float in', kind: 'entrance', duration: 2.6, gait: 'float', path: (u) => ({ y: -2.4 * (1 - EASE.easeOut(u)), scale: lerp(0.4, 1, EASE.easeOut(u)) }) },
  teleportIn: { id: 'teleportIn', label: 'Teleport in', kind: 'entrance', duration: 0.9, gait: null, path: (u) => ({ scale: EASE.overshoot(clamp01(u * 1.15)), ry: (1 - u) * Math.PI * 2 }) },
  walkOut: { id: 'walkOut', label: 'Walk out', kind: 'exit', duration: 2.2, gait: 'walk', path: (u) => { const p = EASE.easeInOut(u); return { x: 4.2 * p, ry: Math.PI / 2 * clamp01(u * 6) }; } },
  flyOut: { id: 'flyOut', label: 'Fly out', kind: 'exit', duration: 1.8, gait: 'fly', path: (u) => { const p = u * u; return { x: -3 * p, y: 4.5 * p, z: -3 * p }; } },
  teleportOut: { id: 'teleportOut', label: 'Teleport out', kind: 'exit', duration: 0.7, gait: null, path: (u) => ({ scale: Math.max(0.001, 1 - EASE.easeInOut(u)), ry: u * Math.PI * 2 }) },

  // Continuous
  walk: { id: 'walk', label: 'Walk in place', kind: 'loop', duration: 1, gait: 'walk', path: () => ({}) },
  run: { id: 'run', label: 'Run in place', kind: 'loop', duration: 1, gait: 'run', path: () => ({}) },
  hop: { id: 'hop', label: 'Hop', kind: 'loop', duration: 1, gait: 'hop', path: () => ({}) },
  float: { id: 'float', label: 'Float', kind: 'loop', duration: 1, gait: 'float', path: (_u, t) => ({ y: 0.35 + Math.sin(t * 1.4) * 0.07 }) },
  circle: { id: 'circle', label: 'Circle', kind: 'loop', duration: 9, gait: 'walk', path: (u) => { const a = u * Math.PI * 2; return { x: Math.sin(a) * 0.9, z: -Math.cos(a) * 0.9 + 0.9, ry: a + Math.PI / 2 }; } },
  slide: { id: 'slide', label: 'Slide', kind: 'loop', duration: 5, gait: null, path: (u) => ({ x: Math.sin(u * Math.PI * 2) * 0.8, ry: Math.cos(u * Math.PI * 2) * 0.5 }) },
};

export const ENTRANCES = Object.values(MOVEMENTS).filter((m) => m.kind === 'entrance');
export const LOOPS = Object.values(MOVEMENTS).filter((m) => m.kind === 'loop');
export const EXITS = Object.values(MOVEMENTS).filter((m) => m.kind === 'exit');

export interface CustomMovement {
  from: 'left' | 'right' | 'top' | 'bottom' | 'back';
  duration: number;
  delay: number;
  easing: Easing;
  gait: Gait;
  distance: number;
}

/** Movement builder: assembles a definition from a few intuitive controls. */
export function buildCustomMovement(c: CustomMovement): MovementDef {
  const ease = EASE[c.easing];
  const d = c.distance;
  const delayU = c.delay / (c.duration + c.delay);
  return {
    id: 'custom', label: 'Custom', kind: 'entrance', duration: c.duration + c.delay, gait: c.gait,
    path(u) {
      const w = clamp01((u - delayU) / (1 - delayU));
      const k = 1 - ease(w);
      const face = c.from === 'left' ? Math.PI / 2 : c.from === 'right' ? -Math.PI / 2 : 0;
      const walking = c.from === 'left' || c.from === 'right';
      const ry = walking ? lerp(face, 0, EASE.easeInOut(clamp01((w - 0.82) / 0.18))) : 0;
      switch (c.from) {
        case 'left': return { x: -d * k, ry, scale: w <= 0 ? 0.001 : 1 };
        case 'right': return { x: d * k, ry, scale: w <= 0 ? 0.001 : 1 };
        case 'top': return { y: d * k, scale: w <= 0 ? 0.001 : 1 };
        case 'bottom': return { y: -d * 0.4 * k, scale: w <= 0 ? 0.001 : 1 };
        case 'back': return { z: -d * 1.6 * k, scale: w <= 0 ? 0.001 : 1 };
      }
    },
  };
}
