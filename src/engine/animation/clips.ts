import type { ClipId, ExpressionId } from '../../mascot/types';

export type Wave = 'sin' | 'hop' | 'noise';

export interface Track {
  channel: string;
  /** Held offset while the clip is at full weight. */
  offset?: number;
  amp?: number;
  /** Cycles per second. */
  freq?: number;
  phase?: number;
  wave?: Wave;
}

export interface ClipDef {
  id: ClipId;
  label: string;
  duration: number;
  loop?: boolean;
  /** Seconds to ease in / out. Easing is what separates this from a looping GIF. */
  in: number;
  out: number;
  expression?: ExpressionId;
  tracks: Track[];
}

// Channel naming: `<role>.<prop>` with prop in posX/Y/Z, rotX/Y/Z, sclX/Y/Z (scl is a fractional change).
// Arm rotZ: armL (+x side) positive lifts outward; armR is the mirror. Arm rotX negative reaches forward.
const sym = (name: 'armL' | 'armR', prop: string, o: Omit<Track, 'channel'>): Track => ({ channel: `${name}.${prop}`, ...o });

export const CLIPS: Record<ClipId, ClipDef> = {
  wave: {
    id: 'wave', label: 'Wave', duration: 2.8, in: 0.35, out: 0.5, expression: 'happy',
    tracks: [
      { channel: 'armR.rotZ', offset: -2.7, amp: 0.4, freq: 2.4, wave: 'sin' },
      { channel: 'head.rotZ', offset: 0.08 }, { channel: 'head.rotY', offset: -0.12 },
      { channel: 'body.rotZ', offset: 0.03 }, { channel: 'earR.rotZ', amp: 0.05, freq: 2.4, phase: 1 },
    ],
  },
  bounce: {
    id: 'bounce', label: 'Bounce', duration: 3.2, in: 0.2, out: 0.5, expression: 'happy',
    tracks: [
      { channel: 'root.posY', amp: 0.17, freq: 1.5, wave: 'hop' },
      { channel: 'body.sclY', offset: -0.075, amp: 0.1, freq: 1.5, wave: 'hop' },
      { channel: 'body.sclX', offset: 0.04, amp: -0.05, freq: 1.5, wave: 'hop' },
      { channel: 'earL.rotZ', amp: 0.2, freq: 1.5, phase: 1.4 }, { channel: 'earR.rotZ', amp: -0.2, freq: 1.5, phase: 1.4 },
      { channel: 'armL.rotZ', offset: 0.3, amp: 0.25, freq: 1.5, phase: 1.4 }, { channel: 'armR.rotZ', offset: -0.3, amp: -0.25, freq: 1.5, phase: 1.4 },
    ],
  },
  dance: {
    id: 'dance', label: 'Dance', duration: 6.4, in: 0.5, out: 0.7, expression: 'happy',
    tracks: [
      { channel: 'root.rotZ', amp: 0.07, freq: 0.9 }, { channel: 'root.posX', amp: 0.07, freq: 0.9, phase: 1.2 },
      { channel: 'root.posY', amp: 0.05, freq: 1.8, wave: 'hop' },
      { channel: 'head.rotZ', amp: -0.13, freq: 0.9, phase: 0.4 }, { channel: 'head.rotY', amp: 0.2, freq: 0.45 },
      { channel: 'armL.rotZ', offset: 1.1, amp: 0.65, freq: 0.9 }, { channel: 'armR.rotZ', offset: -1.1, amp: 0.65, freq: 0.9, phase: Math.PI },
      { channel: 'earL.rotZ', amp: 0.18, freq: 0.9, phase: 1.1 }, { channel: 'earR.rotZ', amp: 0.18, freq: 0.9, phase: 2.2 },
      { channel: 'tail.rotZ', amp: 0.4, freq: 1.8 },
    ],
  },
  curious: {
    id: 'curious', label: 'Curious look', duration: 3.4, in: 0.4, out: 0.6, expression: 'curious',
    tracks: [
      { channel: 'head.rotZ', offset: 0.22 }, { channel: 'head.rotY', offset: 0.18, amp: 0.1, freq: 0.5 }, { channel: 'head.posX', offset: 0.02 },
      { channel: 'earL.rotZ', offset: 0.16 }, { channel: 'earR.rotZ', offset: -0.05 },
      { channel: 'body.posZ', offset: 0.03 }, { channel: 'body.rotX', offset: 0.04 },
    ],
  },
  excited: {
    id: 'excited', label: 'Excited', duration: 2.8, in: 0.15, out: 0.4, expression: 'excited',
    tracks: [
      { channel: 'root.posY', amp: 0.11, freq: 3.2, wave: 'hop' },
      { channel: 'body.sclY', offset: -0.04, amp: 0.06, freq: 3.2, wave: 'hop' },
      { channel: 'armL.rotZ', offset: 1.6, amp: 0.3, freq: 3.2 }, { channel: 'armR.rotZ', offset: -1.6, amp: 0.3, freq: 3.2 },
      { channel: 'earL.rotZ', amp: 0.2, freq: 3.2 }, { channel: 'earR.rotZ', amp: -0.2, freq: 3.2 },
      { channel: 'tail.rotZ', amp: 0.5, freq: 6.4 },
    ],
  },
  think: {
    id: 'think', label: 'Think', duration: 4.2, loop: true, in: 0.5, out: 0.7, expression: 'focused',
    tracks: [
      { channel: 'head.rotZ', offset: -0.12 }, { channel: 'head.rotX', offset: -0.12 }, { channel: 'head.rotY', offset: 0.2, amp: 0.06, freq: 0.2 },
      { channel: 'eyeL.posX', offset: -0.02 }, { channel: 'eyeR.posX', offset: -0.02 },
      { channel: 'eyeL.posY', offset: 0.016 }, { channel: 'eyeR.posY', offset: 0.016 },
      { channel: 'armL.rotZ', offset: 0.9, amp: 0.03, freq: 0.7 }, { channel: 'armL.rotX', offset: -0.7 },
      { channel: 'earL.rotZ', offset: 0.06 }, { channel: 'earR.rotZ', offset: 0.06 },
    ],
  },
  sleep: {
    id: 'sleep', label: 'Sleep', duration: 1, loop: true, in: 1.2, out: 0.9, expression: 'sleepy',
    tracks: [
      { channel: 'head.rotX', offset: 0.3 }, { channel: 'head.rotZ', offset: 0.1 }, { channel: 'body.posY', offset: -0.03 },
      { channel: 'body.sclY', offset: -0.03 }, { channel: 'earL.rotZ', offset: -0.2 }, { channel: 'earR.rotZ', offset: 0.2 },
      { channel: 'armL.rotZ', offset: -0.1 }, { channel: 'armR.rotZ', offset: 0.1 }, { channel: 'breath.amp', offset: 1.1 },
    ],
  },
  celebrate: {
    id: 'celebrate', label: 'Celebrate', duration: 4, in: 0.2, out: 0.6, expression: 'excited',
    tracks: [
      { channel: 'root.posY', amp: 0.2, freq: 1.8, wave: 'hop' },
      { channel: 'body.sclY', offset: -0.08, amp: 0.12, freq: 1.8, wave: 'hop' },
      { channel: 'root.rotY', amp: 0.35, freq: 0.9 },
      { channel: 'armL.rotZ', offset: 2.6, amp: 0.2, freq: 1.8 }, { channel: 'armR.rotZ', offset: -2.6, amp: 0.2, freq: 1.8 },
      { channel: 'head.rotX', offset: -0.1 },
      { channel: 'earL.rotZ', amp: 0.25, freq: 1.8, phase: 1.4 }, { channel: 'earR.rotZ', amp: -0.25, freq: 1.8, phase: 1.4 },
    ],
  },
  poke: {
    id: 'poke', label: 'Poke', duration: 0.9, in: 0.05, out: 0.45, expression: 'surprised',
    tracks: [
      { channel: 'root.posY', amp: 0.09, freq: 1.1, wave: 'hop' },
      { channel: 'body.sclY', offset: -0.05, amp: 0.07, freq: 1.1, wave: 'hop' },
      { channel: 'earL.rotZ', offset: 0.2 }, { channel: 'earR.rotZ', offset: -0.2 },
      { channel: 'head.rotX', offset: -0.08 },
    ],
  },

  // ---- agent working loops
  type: {
    id: 'type', label: 'Typing', duration: 1, loop: true, in: 0.5, out: 0.5, expression: 'focused',
    tracks: [
      sym('armL', 'rotX', { offset: -1.15, amp: 0.1, freq: 3.1 }), sym('armR', 'rotX', { offset: -1.15, amp: 0.1, freq: 3.1, phase: 2.2 }),
      sym('armL', 'rotZ', { offset: 0.25, amp: 0.04, freq: 1.7 }), sym('armR', 'rotZ', { offset: -0.25, amp: 0.04, freq: 1.7, phase: 1 }),
      { channel: 'head.rotX', offset: 0.12, amp: 0.025, freq: 0.6 }, { channel: 'head.rotY', amp: 0.05, freq: 0.35 },
      { channel: 'body.rotX', offset: 0.05 }, { channel: 'earL.rotZ', amp: 0.03, freq: 3.1 }, { channel: 'earR.rotZ', amp: -0.03, freq: 3.1 },
    ],
  },
  read: {
    id: 'read', label: 'Reading', duration: 1, loop: true, in: 0.6, out: 0.6, expression: 'focused',
    tracks: [
      sym('armL', 'rotX', { offset: -1.0 }), sym('armR', 'rotX', { offset: -1.0 }), sym('armL', 'rotZ', { offset: 0.5 }), sym('armR', 'rotZ', { offset: -0.5 }),
      { channel: 'head.rotX', offset: 0.2, amp: 0.02, freq: 0.5 }, { channel: 'head.rotY', amp: 0.09, freq: 0.3 },
      { channel: 'eyeL.posX', amp: 0.012, freq: 0.9 }, { channel: 'eyeR.posX', amp: 0.012, freq: 0.9 },
    ],
  },
  write: {
    id: 'write', label: 'Writing', duration: 1, loop: true, in: 0.5, out: 0.5, expression: 'focused',
    tracks: [
      sym('armR', 'rotX', { offset: -1.25, amp: 0.12, freq: 2.2 }), sym('armR', 'rotZ', { offset: -0.3, amp: 0.1, freq: 1.4 }),
      sym('armL', 'rotX', { offset: -0.9 }), sym('armL', 'rotZ', { offset: 0.5 }),
      { channel: 'head.rotX', offset: 0.22 }, { channel: 'head.rotZ', offset: -0.06, amp: 0.02, freq: 0.5 }, { channel: 'body.rotX', offset: 0.06 },
    ],
  },
  search: {
    id: 'search', label: 'Searching', duration: 1, loop: true, in: 0.5, out: 0.5, expression: 'curious',
    tracks: [
      sym('armR', 'rotZ', { offset: -1.6, amp: 0.18, freq: 0.55 }), sym('armR', 'rotX', { offset: -0.7, amp: 0.12, freq: 0.4 }),
      { channel: 'head.rotY', amp: 0.3, freq: 0.27 }, { channel: 'head.rotZ', offset: 0.08 },
      { channel: 'root.rotY', amp: 0.12, freq: 0.27 }, { channel: 'earL.rotZ', offset: 0.1 }, { channel: 'earR.rotZ', offset: -0.1 },
    ],
  },
  point: {
    id: 'point', label: 'Pointing', duration: 1, loop: true, in: 0.4, out: 0.5, expression: 'excited',
    tracks: [
      sym('armR', 'rotZ', { offset: -1.55, amp: 0.05, freq: 0.9 }), sym('armR', 'rotX', { offset: -0.2 }),
      { channel: 'head.rotY', offset: -0.3 }, { channel: 'head.rotZ', offset: 0.06 }, { channel: 'root.rotY', offset: -0.12 },
      { channel: 'root.posY', amp: 0.03, freq: 1.6, wave: 'hop' },
    ],
  },
  confused: {
    id: 'confused', label: 'Confused', duration: 1, loop: true, in: 0.4, out: 0.5, expression: 'confused',
    tracks: [
      { channel: 'head.rotZ', offset: -0.2, amp: 0.12, freq: 0.5 }, { channel: 'head.rotY', amp: 0.22, freq: 0.5, phase: 1 },
      sym('armL', 'rotZ', { offset: 1.4, amp: 0.25, freq: 0.8 }), sym('armR', 'rotZ', { offset: -1.2, amp: 0.25, freq: 0.8, phase: 1.7 }),
      { channel: 'earL.rotZ', offset: 0.18, amp: 0.1, freq: 0.5 }, { channel: 'earR.rotZ', offset: -0.18, amp: 0.1, freq: 0.5 },
    ],
  },
  wait: {
    id: 'wait', label: 'Waiting', duration: 1, loop: true, in: 0.6, out: 0.6, expression: 'relaxed',
    tracks: [
      { channel: 'root.rotY', amp: 0.12, freq: 0.17 }, { channel: 'head.rotY', amp: 0.28, freq: 0.19 }, { channel: 'head.rotZ', amp: 0.05, freq: 0.27 },
      { channel: 'body.rotZ', amp: 0.03, freq: 0.2 }, sym('armL', 'rotZ', { offset: 0.2, amp: 0.05, freq: 0.3 }),
      { channel: 'tail.rotZ', amp: 0.2, freq: 0.6 }, { channel: 'footR.posY', amp: 0.02, freq: 1.4, wave: 'hop' },
    ],
  },
  sad: {
    id: 'sad', label: 'Disappointed', duration: 1, loop: true, in: 0.8, out: 0.7, expression: 'worried',
    tracks: [
      { channel: 'head.rotX', offset: 0.3 }, { channel: 'body.sclY', offset: -0.05 }, { channel: 'body.posY', offset: -0.03 },
      { channel: 'earL.rotZ', offset: -0.3 }, { channel: 'earR.rotZ', offset: 0.3 }, sym('armL', 'rotZ', { offset: -0.1 }), sym('armR', 'rotZ', { offset: 0.1 }),
      { channel: 'tail.rotZ', offset: -0.2 }, { channel: 'breath.amp', offset: 0.5 },
    ],
  },
  sit: {
    id: 'sit', label: 'Sit', duration: 1, loop: true, in: 0.8, out: 0.7,
    tracks: [
      { channel: 'root.posY', offset: -1 }, // scaled by the mascot's sitDrop in the instance
      { channel: 'footL.posZ', offset: 0.14 }, { channel: 'footR.posZ', offset: 0.14 },
      { channel: 'legFL.rotX', offset: -1.3 }, { channel: 'legFR.rotX', offset: -1.3 }, { channel: 'legBL.rotX', offset: -1.6 }, { channel: 'legBR.rotX', offset: -1.6 },
      { channel: 'body.rotX', offset: -0.06 },
    ],
  },
  carry: {
    id: 'carry', label: 'Carrying', duration: 1, loop: true, in: 0.5, out: 0.5, expression: 'focused',
    tracks: [
      sym('armL', 'rotX', { offset: -1.0 }), sym('armR', 'rotX', { offset: -1.0 }), sym('armL', 'rotZ', { offset: 0.35 }), sym('armR', 'rotZ', { offset: -0.35 }),
      { channel: 'head.rotX', offset: 0.1 }, { channel: 'body.rotX', offset: -0.05 },
    ],
  },
  gallop: {
    id: 'gallop', label: 'Run in place', duration: 1, loop: true, in: 0.4, out: 0.4, expression: 'excited',
    tracks: [{ channel: 'body.rotX', offset: 0.1 }, { channel: 'head.rotX', offset: -0.05 }],
  },
};

export const CLIP_IDS = Object.keys(CLIPS) as ClipId[];
/** Clips that make sense as one-shot buttons in the UI (the rest belong to agent states). */
export const PLAYABLE: ClipId[] = ['wave', 'bounce', 'dance', 'curious', 'excited', 'think', 'celebrate', 'poke', 'point', 'confused', 'sleep'];
