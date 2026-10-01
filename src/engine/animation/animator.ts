import { MathUtils } from 'three';
import type { ClipId, ExpressionId } from '../../mascot/types';
import { CLIPS, type ClipDef, type Track } from './clips';
import { EXPRESSIONS, type ExpressionValues } from './expressions';
import type { MascotInstance } from '../mascotInstance';

export interface AnimInput {
  /** Gaze relative to the head, each axis in [-1, 1]; null when the pointer is idle. */
  gaze: [number, number] | null;
  hover: boolean;
  reduced: boolean;
  /** While dragging, the character holds still-ish so inspection feels stable. */
  dragging: boolean;
}

interface Spring { x: number; v: number }

const PROPS = ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'sclX', 'sclY', 'sclZ'] as const;
const smooth = (x: number) => x * x * (3 - 2 * x);
const noise = (t: number, s: number) => 0.5 * Math.sin(t + s) + 0.3 * Math.sin(t * 2.3 + s * 1.7) + 0.2 * Math.sin(t * 4.1 + s * 2.9);

/**
 * Layered procedural animation. Every frame builds a set of target channel values from
 *   idle (breathing, weight shift, gaze, blink, ear flicks) + expression + the active clip,
 * then drives sprung channels toward them. Springs provide anticipation-free but soft
 * follow-through, so clips blend into each other and settle instead of snapping.
 */
export class Animator {
  private springs = new Map<string, Spring>();
  private targets = new Map<string, number>();
  private expr: ExpressionValues = { ...EXPRESSIONS.neutral };
  private exprTarget: ExpressionId = 'neutral';
  private clip: { def: ClipDef; t: number; weight: number; ending: boolean } | null = null;
  private nextBlink = 1.5;
  private blinkT = -1;
  private doubleBlink = false;
  private nextFlick = 4;
  private flick: { side: 'earL' | 'earR'; t: number } | null = null;
  private nextSaccade = 1.2;
  private saccade: [number, number] = [0, 0];
  private seed = Math.random() * 100;

  constructor(private inst: MascotInstance) {}

  setExpression(id: ExpressionId) { this.exprTarget = id; }

  play(id: ClipId) {
    const def = CLIPS[id];
    if (!def) return;
    this.clip = { def, t: 0, weight: 0, ending: false };
  }

  stop() { if (this.clip) this.clip.ending = true; }
  get playing(): ClipId | null { return this.clip && !this.clip.ending ? this.clip.def.id : null; }

  /** Pose the character at a fixed time without springs — used for thumbnails. */
  freeze(t: number, expression: ExpressionId, clip?: ClipId) {
    this.exprTarget = expression;
    this.expr = { ...EXPRESSIONS[expression] };
    this.springs.clear();
    if (clip) this.play(clip);
    // Simulate from 0 so spring state and clip envelope are what a real session would show at time t.
    const steps = Math.max(30, Math.round(t * 30));
    for (let i = 1; i <= steps; i++) this.update(1 / 30, (i / steps) * t, { gaze: null, hover: false, reduced: !clip, dragging: false });
  }

  update(dtRaw: number, time: number, input: AnimInput) {
    const dt = Math.min(dtRaw, 1 / 20);
    const amp = input.reduced ? 0.3 : 1;
    const T = this.targets;
    T.clear();
    const add = (k: string, v: number) => T.set(k, (T.get(k) ?? 0) + v);

    // --- clip layer
    const clipVals = new Map<string, number>();
    let clipExpr: ExpressionId | null = null;
    if (this.clip) {
      const c = this.clip;
      c.t += dt;
      const natural = !c.def.loop && c.t > c.def.duration - c.def.out;
      if (natural) c.ending = true;
      const target = c.ending ? 0 : 1;
      const dur = c.ending ? c.def.out : c.def.in;
      c.weight = MathUtils.clamp(c.weight + (target - c.weight) * Math.min(1, dt / Math.max(0.05, dur) * 3), 0, 1);
      if (c.ending && c.weight < 0.01) this.clip = null;
      else {
        const w = smooth(c.weight) * (input.reduced ? 0.45 : 1);
        clipExpr = c.def.expression ?? null;
        for (const tr of c.def.tracks) clipVals.set(tr.channel, (clipVals.get(tr.channel) ?? 0) + w * this.trackValue(tr, c.t));
      }
    }
    for (const [k, v] of clipVals) add(k, v);
    const breath = 1 + (clipVals.get('breath.amp') ?? 0);
    const clipActive = clipVals.size > 0 && (this.clip?.weight ?? 0) > 0.3;

    // --- idle layer
    const bt = time * ((Math.PI * 2) / 3.8);
    const b = Math.sin(bt) * breath * amp;
    add('body.sclY', 0.014 * b); add('body.sclX', -0.007 * b); add('body.sclZ', -0.007 * b);
    add('head.posY', 0.007 * Math.sin(bt - 0.7) * breath * amp);
    add('armL.rotZ', 0.025 * b); add('armR.rotZ', -0.025 * b);
    add('earL.rotZ', 0.02 * Math.sin(bt - 1.2)); add('earR.rotZ', -0.02 * Math.sin(bt - 1.2));
    add('tail.rotY', 0.12 * amp * noise(time * 0.7, this.seed));
    add('tail.rotZ', 0.06 * amp * noise(time * 0.9, this.seed + 3));
    // weight shift
    add('root.rotZ', 0.014 * amp * noise(time * 0.31, this.seed + 5));
    add('body.posX', 0.012 * amp * noise(time * 0.27, this.seed + 8));
    add('root.rotY', 0.03 * amp * noise(time * 0.19, this.seed + 11));
    add('head.rotZ', 0.025 * amp * noise(time * 0.43, this.seed + 14));
    add('head.rotX', 0.02 * amp * noise(time * 0.37, this.seed + 17));
    add('antenna.rotZ', 0.12 * amp * noise(time * 1.3, this.seed + 20));

    // gaze: eyes lead, head follows at a fraction
    let look: [number, number] = [0, 0];
    if (input.gaze && !clipActive) { look = input.gaze; }
    else if (!clipActive) {
      if (time > this.nextSaccade) {
        this.saccade = [(Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5];
        this.nextSaccade = time + 1.2 + Math.random() * 3;
      }
      look = this.saccade;
    }
    const g = input.reduced ? 0.4 : 1;
    for (const s of ['eyeL', 'eyeR']) { add(`${s}.posX`, look[0] * 0.026 * g); add(`${s}.posY`, look[1] * 0.017 * g); }
    add('head.rotY', look[0] * 0.32 * g * (input.gaze ? 1 : 0.35));
    add('head.rotX', -look[1] * 0.2 * g * (input.gaze ? 1 : 0.35));
    add('body.rotY', look[0] * 0.08 * g * (input.gaze ? 1 : 0));

    // hover: ears perk, face brightens
    const hov = input.hover && !clipActive ? 1 : 0;
    add('earL.rotZ', 0.12 * hov); add('earR.rotZ', -0.12 * hov);
    add('head.posY', 0.01 * hov);

    // ear flick
    if (!this.flick && time > this.nextFlick && !input.reduced) {
      this.flick = { side: Math.random() < 0.5 ? 'earL' : 'earR', t: 0 };
      this.nextFlick = time + 4 + Math.random() * 6;
    }
    if (this.flick) {
      this.flick.t += dt;
      const k = this.flick.t / 0.32;
      if (k >= 1) this.flick = null;
      else add(`${this.flick.side}.rotZ`, (this.flick.side === 'earL' ? 1 : -1) * 0.2 * Math.sin(k * Math.PI) * Math.sin(k * Math.PI * 3));
    }

    // --- expression layer (smoothed, then mapped to channels)
    const targetId = clipExpr ?? this.exprTarget;
    const tgt = EXPRESSIONS[targetId];
    const ek = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(this.expr) as (keyof ExpressionValues)[]) {
      let goal = tgt[key];
      if (hov) {
        if (key === 'smile') goal = Math.max(goal, 0.8);
        if (key === 'cheek') goal = Math.max(goal, 0.8);
        if (key === 'eyeOpen') goal += 0.08;
      }
      this.expr[key] += (goal - this.expr[key]) * ek;
    }
    const e = this.expr;
    add('eyeL.sclY', e.eyeOpen - 1); add('eyeR.sclY', e.eyeOpen - 1);
    add('eyeL.sclX', (e.eyeOpen - 1) * -0.2); add('eyeR.sclX', (e.eyeOpen - 1) * -0.2);
    add('mouth.sclY', e.smile - 1); add('mouth.sclX', 0.15 * (e.smile - 0.4));
    add('mouthOpen.sclY', e.open - 1); add('mouthOpen.sclX', e.open * 0.15 - 0.15);
    add('browL.posY', e.browLift * 0.03); add('browR.posY', e.browLift * 0.03);
    add('browL.rotZ', e.browTilt); add('browR.rotZ', -e.browTilt);
    add('cheekL.sclX', 0.4 + e.cheek * 0.8 - 1); add('cheekL.sclY', 0.4 + e.cheek * 0.8 - 1);
    add('cheekR.sclX', 0.4 + e.cheek * 0.8 - 1); add('cheekR.sclY', 0.4 + e.cheek * 0.8 - 1);
    add('earL.rotZ', e.earLift); add('earR.rotZ', -e.earLift);
    add('head.rotZ', e.headTilt);

    // --- blink (applied after springs, see apply())
    let blink = 1;
    if (this.blinkT < 0 && time > this.nextBlink && !input.reduced) {
      this.blinkT = 0;
      this.doubleBlink = Math.random() < 0.18;
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.2;
      const k = this.blinkT / d;
      blink = 1 - 0.94 * Math.sin(Math.min(1, k) * Math.PI);
      if (k >= 1) {
        this.blinkT = -1;
        this.nextBlink = time + (this.doubleBlink ? 0.12 : 2.4 + Math.random() * 3.6);
        this.doubleBlink = false;
      }
    }

    this.integrate(dt, input.dragging ? 1.4 : 1);
    this.apply(blink);
  }

  private trackValue(tr: Track, t: number): number {
    const f = tr.freq ?? 1;
    const ph = tr.phase ?? 0;
    let w = 0;
    if (tr.amp) {
      switch (tr.wave ?? 'sin') {
        case 'sin': w = Math.sin(Math.PI * 2 * f * t + ph); break;
        case 'hop': w = Math.abs(Math.sin(Math.PI * f * t + ph)); break;
        case 'noise': w = noise(f * t, ph); break;
      }
    }
    return (tr.offset ?? 0) + (tr.amp ?? 0) * w;
  }

  private integrate(dt: number, damp: number) {
    for (const k of this.targets.keys()) if (!this.springs.has(k)) this.springs.set(k, { x: 0, v: 0 });
    const steps = 2, h = dt / steps;
    for (const [key, s] of this.springs) {
      const goal = this.targets.get(key) ?? 0;
      const role = key.split('.')[0];
      const stiff = role === 'head' ? 80 : role.startsWith('eye') || role.startsWith('mouth') || role.startsWith('brow') || role.startsWith('cheek') ? 260 : role === 'root' || role === 'body' ? 150 : 110;
      const zeta = (role === 'earL' || role === 'earR' || role === 'tail' ? 0.45 : 0.78) * damp;
      const c = 2 * Math.sqrt(stiff) * zeta;
      for (let i = 0; i < steps; i++) {
        s.v += (stiff * (goal - s.x) - c * s.v) * h;
        s.x += s.v * h;
      }
    }
  }

  private apply(blink: number) {
    const val = (k: string) => this.springs.get(k)?.x ?? 0;
    for (const [role, binds] of this.inst.roles) {
      for (const b of binds) {
        const v = (p: (typeof PROPS)[number]) => val(`${role}.${p}`);
        b.obj.position.set(b.p.x + v('posX'), b.p.y + v('posY'), b.p.z + v('posZ'));
        b.obj.rotation.set(b.r.x + v('rotX'), b.r.y + v('rotY'), b.r.z + v('rotZ'));
        const eye = role === 'eyeL' || role === 'eyeR';
        b.obj.scale.set(
          Math.max(1e-3, b.s.x * (1 + v('sclX'))),
          Math.max(1e-3, b.s.y * (1 + v('sclY')) * (eye ? blink : 1)),
          Math.max(1e-3, b.s.z * (1 + v('sclZ'))),
        );
      }
    }
  }

  /** Height above ground of the root, used to fade the contact shadow while hopping. */
  get lift() { return Math.max(0, this.springs.get('root.posY')?.x ?? 0); }
}
