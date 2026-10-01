import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { CameraPresetId, MascotDefinition } from '../mascot/types';

interface Pose { az: number; pol: number; dist: number; ty: number; fov: number }

/** Distances and heights are expressed in units of mascot height so presets work for any mascot. */
export const CAMERA_PRESETS: Record<CameraPresetId, Pose & { label: string }> = {
  hero: { label: 'Hero', az: 0.38, pol: 1.43, dist: 2.35, ty: 0.02, fov: 28 },
  portrait: { label: 'Portrait', az: 0.18, pol: 1.46, dist: 1.2, ty: 0.28, fov: 26 },
  threeQuarter: { label: 'Three-quarter', az: 0.85, pol: 1.4, dist: 2.2, ty: 0.04, fov: 28 },
  closeUp: { label: 'Close-up', az: -0.12, pol: 1.5, dist: 0.8, ty: 0.3, fov: 24 },
  fullBody: { label: 'Full body', az: 0, pol: 1.52, dist: 3.0, ty: -0.02, fov: 30 },
  cinematic: { label: 'Cinematic', az: -0.6, pol: 1.68, dist: 2.0, ty: 0.12, fov: 22 },
  inspection: { label: 'Inspection', az: 0.9, pol: 1.35, dist: 1.9, ty: 0.06, fov: 32 },
  side: { label: 'Side', az: Math.PI / 2, pol: 1.5, dist: 2.4, ty: 0.02, fov: 28 },
  rear: { label: 'Rear', az: Math.PI, pol: 1.45, dist: 2.4, ty: 0.02, fov: 28 },
  lowAngle: { label: 'Low angle', az: 0.3, pol: 1.78, dist: 2.1, ty: -0.05, fov: 30 },
  highAngle: { label: 'High angle', az: 0.3, pol: 0.95, dist: 2.3, ty: 0.02, fov: 28 },
};

export interface RigOptions { zoom: boolean; orbit: boolean; pan: boolean; returnToPreset: boolean; parallax: number }

const POL_MIN = 0.45, POL_MAX = 1.85;

export class CameraRig {
  private cur: Pose = { ...CAMERA_PRESETS.hero };
  private goal: Pose = { ...CAMERA_PRESETS.hero };
  private preset: CameraPresetId = 'hero';
  private height = 1.5;
  private center = new Vector3(0, 0.75, 0);
  private dragging = false;
  private lastInput = -99;
  private tmp = new Vector3();
  private panGoal = { x: 0, y: 0 };
  private panCur = { x: 0, y: 0 };
  private pushAmt = 0;

  constructor(private opts: RigOptions) {}

  setFraming(def: MascotDefinition) {
    this.height = def.framing.height;
    this.center.set(...def.framing.center);
  }

  setPreset(id: CameraPresetId, instant = false) {
    this.preset = id;
    const p = CAMERA_PRESETS[id];
    // Take the shortest way round in azimuth.
    const target = p.az + Math.round((this.goal.az - p.az) / (Math.PI * 2)) * Math.PI * 2;
    this.goal = { az: target, pol: p.pol, dist: p.dist * this.height, ty: p.ty * this.height, fov: p.fov };
    this.panGoal = { x: 0, y: 0 };
    if (instant) { this.cur = { ...this.goal }; this.panCur = { x: 0, y: 0 }; }
  }
  get presetId() { return this.preset; }
  /** Dolly in during scene transitions; 0..~0.15. */
  setPush(v: number) { this.pushAmt = v; }

  beginDrag() { this.dragging = true; }
  endDrag(now: number) { this.dragging = false; this.lastInput = now; }
  get isDragging() { return this.dragging; }

  drag(dx: number, dy: number, now: number) {
    if (!this.opts.orbit) return;
    this.goal.az -= dx * 0.0062;
    this.goal.pol = MathUtils.clamp(this.goal.pol - dy * 0.0045, POL_MIN, POL_MAX);
    this.lastInput = now;
  }

  pan(dx: number, dy: number, now: number) {
    if (!this.opts.pan) return;
    const k = (this.goal.dist / 900) * 1.1, lim = this.height * 0.8;
    this.panGoal.x = MathUtils.clamp(this.panGoal.x - dx * k, -lim, lim);
    this.panGoal.y = MathUtils.clamp(this.panGoal.y + dy * k, -lim, lim);
    this.lastInput = now;
  }

  orbitBy(az: number, pol: number, now: number) {
    if (!this.opts.orbit) return;
    this.goal.az += az;
    this.goal.pol = MathUtils.clamp(this.goal.pol + pol, POL_MIN, POL_MAX);
    this.lastInput = now;
  }

  zoomBy(factor: number, now: number) {
    if (!this.opts.zoom) return;
    this.goal.dist = MathUtils.clamp(this.goal.dist * factor, this.height * 0.4, this.height * 3.4);
    this.lastInput = now;
  }

  update(camera: PerspectiveCamera, dt: number, now: number, pointer: [number, number], reduced: boolean) {
    if (this.opts.returnToPreset && !this.dragging && now - this.lastInput > 3.2 && this.lastInput > 0) {
      this.setPreset(this.preset);
      this.lastInput = -99;
    }
    const k = reduced ? 40 : this.dragging ? 22 : 4.2;
    const a = 1 - Math.exp(-k * dt);
    const c = this.cur, g = this.goal;
    c.az += (g.az - c.az) * a; c.pol += (g.pol - c.pol) * a; c.dist += (g.dist - c.dist) * a;
    c.ty += (g.ty - c.ty) * a; c.fov += (g.fov - c.fov) * a;
    this.panCur.x += (this.panGoal.x - this.panCur.x) * a; this.panCur.y += (this.panGoal.y - this.panCur.y) * a;

    // Slow idle drift + pointer parallax; both off for reduced motion.
    const drift = reduced ? 0 : Math.sin(now * 0.21) * 0.045;
    const par = reduced ? 0 : this.opts.parallax;
    const az = c.az + drift + pointer[0] * 0.07 * par;
    const pol = MathUtils.clamp(c.pol - pointer[1] * 0.035 * par, POL_MIN, POL_MAX);

    const aspect = camera.aspect;
    // Portrait viewports need more distance to keep the character inside the frame.
    const fit = aspect < 1 ? Math.min(2.1, Math.pow(1 / aspect, 0.8)) : 1;
    const d = c.dist * fit * (1 - this.pushAmt);
    const right = this.tmp.set(Math.cos(az), 0, -Math.sin(az));
    const target = new Vector3(this.center.x + right.x * this.panCur.x, this.center.y + c.ty + this.panCur.y, this.center.z + right.z * this.panCur.x);
    camera.position.set(
      target.x + d * Math.sin(pol) * Math.sin(az),
      Math.max(0.12, target.y + d * Math.cos(pol)),
      target.z + d * Math.sin(pol) * Math.cos(az),
    );
    camera.lookAt(target);
    if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  }
}
