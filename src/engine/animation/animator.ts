import { MathUtils } from 'three';
import type { ClipId, ExpressionId } from '../../mascot/types';
import { CLIPS, type ClipDef, type Track } from './clips';
import { EXPRESSIONS, type ExpressionValues } from './expressions';
import { EASE, type Gait, type MovementDef, type Pose } from './movement';
import type { MascotInstance } from '../mascotInstance';

export interface AnimInput {
  /** Gaze relative to the head, each axis in [-1, 1]; null when the pointer is idle. */
  gaze: [number, number] | null;
  hover: boolean;
  reduced: boolean;
  /** While dragging, the character holds still-ish so inspection feels stable. */
  dragging: boolean;
  /** User scalars from the Motion controls. */
  energy?: number;
  speed?: number;
  blinkSpeed?: number;
}

interface Spring { x: number; v: number }
interface Layer { def: ClipDef; t: number; weight: number; ending: boolean }

const smooth = (x: number) => x * x * (3 - 2 * x);
const noise = (t: number, s: number) => 0.5 * Math.sin(t + s) + 0.3 * Math.sin(t * 2.3 + s * 1.7) + 0.2 * Math.sin(t * 4.1 + s * 2.9);

const GAITS: Record<Exclude<Gait, null>, { freq: number; stride: number; legs: number; lift: number; bob: number; arms: number; lean: number }> = {
  walk: { freq: 1.6, stride: 0.09, legs: 0.55, lift: 0.04, bob: 0.014, arms: 0.45, lean: 0.03 },
  run: { freq: 3.0, stride: 0.15, legs: 0.95, lift: 0.08, bob: 0.03, arms: 0.9, lean: 0.14 },
  hop: { freq: 1.5, stride: 0, legs: 0, lift: 0, bob: 0, arms: 0, lean: 0 },
  fly: { freq: 1.9, stride: 0, legs: 0, lift: 0, bob: 0, arms: 0, lean: 0.12 },
  float: { freq: 1.0, stride: 0, legs: 0, lift: 0, bob: 0, arms: 0, lean: 0 },
};

/**
 * Layered procedural animation. Every frame builds target channel values from
 *   idle (breathing, weight shift, gaze, blink, ear flicks) + gait + expression
 *   + a persistent state loop (agent) + an optional one-shot clip,
 * then drives sprung channels toward them. Springs give follow-through and settling, so layers blend
 * and settle instead of snapping. Movement (root path) is applied directly, without lag.
 */
export class Animator {
  private springs = new Map<string, Spring>();
  private targets = new Map<string, number>();
  private expr: ExpressionValues = { ...EXPRESSIONS.neutral };
  private exprTarget: ExpressionId = 'neutral';
  private shot: Layer | null = null;
  private state: Layer | null = null;
  private stateExpr: ExpressionId | null = null;
  private sit: Layer | null = null;
  private move: { def: MovementDef; t: number; delay: number; done?: () => void; hold: boolean } | null = null;
  private pose: Pose = { x: 0, y: 0, z: 0, ry: 0, scale: 1 };
  private gait: Gait = null;
  private gaitW = 0;
  private gaitPhase = 0;
  private clock = 0;
  private nextBlink = 1.5;
  private blinkT = -1;
  private doubleBlink = false;
  private nextFlick = 4;
  private flick: { side: 'earL' | 'earR'; t: number } | null = null;
  private nextSaccade = 1.2;
  private saccade: [number, number] = [0, 0];
  private seed = Math.random() * 100;
  private mouthFlip = false;
  private alias = new Map<string, string>();

  constructor(private inst: MascotInstance) {
    for (const [from, to] of Object.entries(inst.def.roleAliases ?? {})) if (!inst.roles.has(from as never) && inst.roles.has(to as never)) this.alias.set(from, to as string);
  }

  setExpression(id: ExpressionId) { this.exprTarget = id; }

  play(id: ClipId) {
    const def = CLIPS[id];
    if (!def) return;
    this.shot = { def, t: 0, weight: 0, ending: false };
  }
  stop() { if (this.shot) this.shot.ending = true; }
  get playing(): ClipId | null { return this.shot && !this.shot.ending ? this.shot.def.id : null; }

  /** Persistent loop driven by an agent state; null clears it. */
  setStateClip(id: ClipId | null, sits: boolean) {
    const want = id ? CLIPS[id] : null;
    if (want && this.state && this.state.def === want && !this.state.ending) { /* unchanged */ } else if (want) this.state = { def: want, t: 0, weight: this.state ? Math.min(this.state.weight, 0.35) : 0, ending: false };
    else if (this.state) this.state.ending = true;
    this.stateExpr = want?.expression ?? null;
    if (sits) { if (!this.sit || this.sit.ending) this.sit = { def: CLIPS.sit, t: 0, weight: this.sit?.weight ?? 0, ending: false }; }
    else if (this.sit) this.sit.ending = true;
  }

  playMovement(def: MovementDef, done?: () => void, delay = 0) {
    this.move = { def, t: 0, delay, done, hold: false };
    this.gait = def.gait;
  }
  stopMovement() { this.move = null; this.gait = null; this.pose = { x: 0, y: 0, z: 0, ry: 0, scale: 1 }; }
  get moving() { return !!this.move; }
  /** Entrance finished: hold at rest pose, ready for the next movement. */
  get rootOffset() { return this.pose; }

  /** Pose the character at a fixed time without springs — used for thumbnails. */
  freeze(t: number, expression: ExpressionId, clip?: ClipId) {
    this.exprTarget = expression;
    this.expr = { ...EXPRESSIONS[expression] };
    this.springs.clear();
    this.pose = { x: 0, y: 0, z: 0, ry: 0, scale: 1 };
    if (clip) this.play(clip);
    const steps = Math.max(30, Math.round(t * 30));
    for (let i = 1; i <= steps; i++) this.update(1 / 30, (i / steps) * t, { gaze: null, hover: false, reduced: !clip && !this.state, dragging: false });
    this.springs.forEach((s) => { s.v = 0; });
  }

  private advance(l: Layer | null, dt: number, reduced: boolean): { l: Layer | null; w: number } {
    if (!l) return { l, w: 0 };
    l.t += dt;
    if (!l.def.loop && !l.ending && l.t > l.def.duration - l.def.out) l.ending = true;
    const target = l.ending ? 0 : 1;
    const dur = l.ending ? l.def.out : l.def.in;
    l.weight = MathUtils.clamp(l.weight + (target - l.weight) * Math.min(1, (dt / Math.max(0.05, dur)) * 3), 0, 1);
    if (l.ending && l.weight < 0.01) return { l: null, w: 0 };
    return { l, w: smooth(l.weight) * (reduced ? 0.5 : 1) };
  }

  update(dtRaw: number, time: number, input: AnimInput) {
    const dt = Math.min(dtRaw, 1 / 20);
    const speed = Math.max(0.1, input.speed ?? 1);
    const dts = dt * speed;
    this.clock += dts;
    const T = this.clock;
    const energy = input.reduced ? 0.3 : (input.energy ?? 1);
    const amp = energy;
    const out = this.targets;
    out.clear();
    const add = (k: string, v: number) => out.set(k, (out.get(k) ?? 0) + v);
    void time;

    // --- clip layers (one-shot, agent state, sit)
    let clipExpr: ExpressionId | null = null;
    let breath = 1;
    let clipActive = false;
    const run = (layer: Layer | null, set: (l: Layer | null) => void) => {
      const r = this.advance(layer, dts, input.reduced);
      set(r.l);
      if (!r.l) return;
      const w = r.w * Math.min(1.4, 0.5 + energy * 0.5);
      if (r.l.def.expression && !clipExpr) clipExpr = r.l.def.expression;
      if (r.w > 0.3 && !r.l.def.id.startsWith('sit')) clipActive = true;
      for (const tr of r.l.def.tracks) {
        let v = this.trackValue(tr, r.l.t);
        if (r.l.def.id === 'sit' && tr.channel === 'root.posY') v *= this.inst.def.sitDrop;
        if (tr.channel === 'breath.amp') { breath += w * v; continue; }
        const [role, prop] = tr.channel.split('.');
        add(`${this.alias.get(role) ?? role}.${prop}`, w * v);
      }
    };
    run(this.sit, (l) => { this.sit = l; });
    run(this.state, (l) => { this.state = l; });
    run(this.shot, (l) => { this.shot = l; });
    if (this.shot && !this.shot.ending) clipExpr = this.shot.def.expression ?? clipExpr;
    else if (this.state && this.stateExpr) clipExpr = this.stateExpr;

    // --- movement + gait
    if (this.move) {
      const m = this.move;
      m.t += dts;
      const tt = m.t - m.delay;
      if (tt >= 0) {
        const looping = m.def.kind === 'loop';
        const u = looping ? (tt / m.def.duration) % 1 : Math.min(1, tt / m.def.duration);
        const p = m.def.path(u, tt);
        const k = this.inst.def.framing.height / 1.95;
        this.pose = { x: (p.x ?? 0) * k, y: (p.y ?? 0) * k, z: (p.z ?? 0) * k, ry: p.ry ?? 0, scale: p.scale ?? 1 };
        if (!looping && u >= 1) {
          const done = m.done;
          this.move = m.def.kind === 'exit' ? { ...m, hold: true } : null;
          if (m.def.kind !== 'exit') { this.gait = null; this.pose = { x: 0, y: 0, z: 0, ry: 0, scale: 1 }; }
          done?.();
        }
      } else if (m.def.kind === 'entrance') this.pose = { ...this.pose, scale: 0.001 };
    }
    const gaitOn = this.gait && (this.move || this.gait === 'float') ? this.gait : null;
    this.gaitW += ((gaitOn ? 1 : 0) - this.gaitW) * Math.min(1, dt * 6);
    if (gaitOn) this.gaitPhase += dts * Math.PI * 2 * GAITS[gaitOn].freq;
    if (this.gaitW > 0.01 && gaitOn) this.applyGait(gaitOn, this.gaitPhase, this.gaitW, add);
    else if (!gaitOn && this.gaitW > 0.01) this.gaitPhase += dts * 8; // settle feet while blending out
    const moving = this.gaitW * 0.7;

    // --- idle layer
    const bt = T * ((Math.PI * 2) / 3.8);
    const b = Math.sin(bt) * breath * amp;
    add('body.sclY', 0.014 * b); add('body.sclX', -0.007 * b); add('body.sclZ', -0.007 * b);
    add('head.posY', 0.007 * Math.sin(bt - 0.7) * breath * amp);
    add('armL.rotZ', 0.025 * b); add('armR.rotZ', -0.025 * b);
    add('earL.rotZ', 0.02 * Math.sin(bt - 1.2)); add('earR.rotZ', -0.02 * Math.sin(bt - 1.2));
    add('tail.rotY', 0.12 * amp * noise(T * 0.7, this.seed)); add('tail.rotZ', 0.06 * amp * noise(T * 0.9, this.seed + 3));
    add('topknot.rotZ', 0.05 * amp * noise(T * 0.8, this.seed + 6));
    add('neck.rotZ', 0.02 * amp * noise(T * 0.4, this.seed + 7));
    const idleK = 1 - moving * 0.6;
    add('root.rotZ', 0.014 * amp * idleK * noise(T * 0.31, this.seed + 5));
    add('body.posX', 0.012 * amp * idleK * noise(T * 0.27, this.seed + 8));
    add('root.rotY', 0.03 * amp * idleK * (clipActive ? 0.3 : 1) * noise(T * 0.19, this.seed + 11));
    add('head.rotZ', 0.025 * amp * noise(T * 0.43, this.seed + 14));
    add('head.rotX', 0.02 * amp * noise(T * 0.37, this.seed + 17));
    add('antenna.rotZ', 0.12 * amp * noise(T * 1.3, this.seed + 20));

    // gaze: eyes lead, head follows at a fraction
    let look: [number, number] = [0, 0];
    const busy = clipActive && !!this.state;
    if (input.gaze && !busy) look = input.gaze;
    else if (!busy) {
      if (T > this.nextSaccade) { this.saccade = [(Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5]; this.nextSaccade = T + 1.2 + Math.random() * 3; }
      look = this.saccade;
    }
    const g = input.reduced ? 0.4 : 1;
    for (const s of ['eyeL', 'eyeR']) { add(`${s}.posX`, look[0] * 0.026 * g); add(`${s}.posY`, look[1] * 0.017 * g); }
    const follow = busy ? 0 : input.gaze ? 1 : 0.35;
    add('head.rotY', look[0] * 0.32 * g * follow); add('head.rotX', -look[1] * 0.2 * g * follow); add('body.rotY', look[0] * 0.08 * g * (input.gaze && !busy ? 1 : 0));

    const hov = input.hover && !clipActive ? 1 : 0;
    add('earL.rotZ', 0.12 * hov); add('earR.rotZ', -0.12 * hov); add('head.posY', 0.01 * hov);

    if (!this.flick && T > this.nextFlick && !input.reduced) { this.flick = { side: Math.random() < 0.5 ? 'earL' : 'earR', t: 0 }; this.nextFlick = T + 4 + Math.random() * 6; }
    if (this.flick) {
      this.flick.t += dt;
      const k = this.flick.t / 0.32;
      if (k >= 1) this.flick = null;
      else add(`${this.flick.side}.rotZ`, (this.flick.side === 'earL' ? 1 : -1) * 0.2 * Math.sin(k * Math.PI) * Math.sin(k * Math.PI * 3));
    }

    // --- expression layer (smoothed, then mapped to channels)
    const tgt = EXPRESSIONS[(clipExpr as ExpressionId | null) ?? this.exprTarget];
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
    const talk = e.talk > 0.05 ? (0.5 + 0.5 * Math.sin(T * 13 + Math.sin(T * 3.1) * 2)) * e.talk * (0.6 + 0.4 * Math.sin(T * 5.3)) : 0;
    const open = e.open + talk * 0.8;
    this.mouthFlip = e.smile < -0.02;
    add('eyeL.sclY', e.eyeOpen - 1); add('eyeR.sclY', e.eyeOpen - 1);
    add('eyeL.sclX', (e.eyeOpen - 1) * -0.2); add('eyeR.sclX', (e.eyeOpen - 1) * -0.2);
    add('mouth.sclY', Math.max(0.05, Math.abs(e.smile)) - 1); add('mouth.sclX', 0.15 * (Math.abs(e.smile) - 0.4) + e.wide);
    add('mouth.posY', this.mouthFlip ? -0.012 : 0);
    add('mouthOpen.sclY', open - 1); add('mouthOpen.sclX', open * 0.15 - 0.15 + e.wide * 0.5);
    add('browL.posY', e.browLift * 0.03); add('browR.posY', e.browLift * 0.03);
    add('browL.rotZ', e.browTilt); add('browR.rotZ', -e.browTilt);
    const ch = 0.4 + e.cheek * 0.8 - 1;
    add('cheekL.sclX', ch); add('cheekL.sclY', ch); add('cheekR.sclX', ch); add('cheekR.sclY', ch);
    add('earL.rotZ', e.earLift); add('earR.rotZ', -e.earLift); add('head.rotZ', e.headTilt);
    if (e.shake > 0.05) add('head.posY', Math.sin(T * 22) * 0.012 * e.shake);

    // --- blink (applied after springs, see apply())
    let blink = 1;
    const bs = Math.max(0.3, input.blinkSpeed ?? 1);
    if (this.blinkT < 0 && T > this.nextBlink && !input.reduced) { this.blinkT = 0; this.doubleBlink = Math.random() < 0.18; }
    if (this.blinkT >= 0) {
      this.blinkT += dt * bs;
      const k = this.blinkT / 0.2;
      blink = 1 - 0.94 * Math.sin(Math.min(1, k) * Math.PI);
      if (k >= 1) { this.blinkT = -1; this.nextBlink = T + (this.doubleBlink ? 0.12 : 2.4 + Math.random() * 3.6); this.doubleBlink = false; }
    }

    this.integrate(dt, input.dragging ? 1.4 : 1);
    this.apply(blink);
  }

  private applyGait(g: Exclude<Gait, null>, ph: number, w: number, add: (k: string, v: number) => void) {
    const c = GAITS[g], s = Math.sin(ph), co = Math.cos(ph);
    if (g === 'walk' || g === 'run') {
      add('footL.posZ', w * c.stride * s); add('footR.posZ', -w * c.stride * s);
      add('footL.posY', w * c.lift * Math.max(0, co)); add('footR.posY', w * c.lift * Math.max(0, -co));
      add('legBR.rotX', -w * c.legs * s); add('legBL.rotX', w * c.legs * s);
      add(this.alias.has('armL') ? 'legFL.rotX' : 'armL.rotX', -w * c.arms * s); add(this.alias.has('armR') ? 'legFR.rotX' : 'armR.rotX', w * c.arms * s);
      add('root.posY', w * c.bob * Math.abs(co)); add('root.rotZ', w * 0.025 * s); add('body.rotX', w * c.lean);
      add('head.rotZ', -w * 0.02 * s); add('earL.rotZ', w * 0.08 * Math.sin(ph * 2)); add('earR.rotZ', -w * 0.08 * Math.sin(ph * 2));
      add('tail.rotZ', w * 0.2 * s);
    } else if (g === 'hop') {
      const h = Math.abs(Math.sin(ph / 2));
      add('root.posY', w * 0.28 * h); add('body.sclY', w * (0.07 * (1 - h) - 0.05 * h)); add('body.sclX', w * -0.04 * (1 - h));
      add('earL.rotZ', w * 0.2 * (1 - h)); add('earR.rotZ', -w * 0.2 * (1 - h));
      add('armL.rotZ', w * 0.5 * h); add('armR.rotZ', -w * 0.5 * h); add('legFL.rotX', -w * 0.5 * h); add('legFR.rotX', -w * 0.5 * h);
    } else if (g === 'fly') {
      add('armL.rotZ', w * (1.35 + 0.35 * s)); add('armR.rotZ', -w * (1.35 + 0.35 * s));
      add('root.posY', w * 0.05 * Math.sin(ph * 0.5)); add('body.rotX', w * c.lean); add('root.rotZ', w * 0.08 * Math.sin(ph * 0.5));
      add('footL.posZ', -w * 0.05); add('footR.posZ', -w * 0.05); add('earL.rotZ', w * 0.2 * s); add('earR.rotZ', -w * 0.2 * s);
      add('legFL.rotX', w * 0.6); add('legFR.rotX', w * 0.6); add('legBL.rotX', w * 0.9); add('legBR.rotX', w * 0.9);
    } else {
      add('armL.rotZ', w * (0.5 + 0.1 * s)); add('armR.rotZ', -w * (0.5 + 0.1 * s)); add('earL.rotZ', w * 0.1 * s); add('earR.rotZ', -w * 0.1 * s);
      add('footL.posZ', -w * 0.03); add('footR.posZ', -w * 0.03); add('tail.rotZ', w * 0.2 * s);
    }
  }

  private trackValue(tr: Track, t: number): number {
    const f = tr.freq ?? 1, ph = tr.phase ?? 0;
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
      const stiff = role === 'head' ? 80 : role.startsWith('eye') || role.startsWith('mouth') || role.startsWith('brow') || role.startsWith('cheek') ? 260 : role === 'root' || role === 'body' ? 150 : role.startsWith('foot') || role.startsWith('leg') ? 220 : 110;
      const loose = role === 'earL' || role === 'earR' || role === 'tail' || role === 'topknot';
      const c = 2 * Math.sqrt(stiff) * (loose ? 0.45 : 0.78) * damp;
      for (let i = 0; i < steps; i++) { s.v += (stiff * (goal - s.x) - c * s.v) * h; s.x += s.v * h; }
    }
  }

  private apply(blink: number) {
    const val = (k: string) => this.springs.get(k)?.x ?? 0;
    for (const [role, binds] of this.inst.roles) {
      for (const b of binds) {
        const v = (p: string) => val(`${role}.${p}`);
        b.obj.position.set(b.p.x + v('posX'), b.p.y + v('posY'), b.p.z + v('posZ'));
        b.obj.rotation.set(b.r.x + v('rotX'), b.r.y + v('rotY'), b.r.z + v('rotZ') + (role === 'mouth' && this.mouthFlip ? Math.PI : 0));
        const eye = role === 'eyeL' || role === 'eyeR';
        b.obj.scale.set(
          Math.max(1e-3, b.s.x * (1 + v('sclX'))),
          Math.max(1e-3, b.s.y * (1 + v('sclY')) * (eye ? blink : 1)),
          Math.max(1e-3, b.s.z * (1 + v('sclZ'))),
        );
        if (role === 'root') {
          b.obj.position.x += this.pose.x; b.obj.position.y += this.pose.y; b.obj.position.z += this.pose.z;
          b.obj.rotation.y += this.pose.ry;
          b.obj.scale.multiplyScalar(this.pose.scale);
        }
      }
    }
  }

  /** Height above ground of the root, used to fade the contact shadow while hopping. */
  get lift() { return Math.max(0, (this.springs.get('root.posY')?.x ?? 0) + this.pose.y); }
  get gaitSpeed() { return this.gaitW; }
  /** Apply a smoothstep'd easing preview for UI. */
  static ease = EASE;
}
