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
};

export interface RigOptions { zoom: boolean; orbit: boolean; returnToPreset: boolean; parallax: number }

const POL_MIN = 0.45, POL_MAX = 1.72;

export class CameraRig {
  private cur: Pose = { ...CAMERA_PRESETS.hero };
  private goal: Pose = { ...CAMERA_PRESETS.hero };
  private preset: CameraPresetId = 'hero';
  private height = 1.5;
  private center = new Vector3(0, 0.75, 0);
  private dragging = false;
  private lastInput = -99;
  private tmp = new Vector3();

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
    if (instant) this.cur = { ...this.goal };
  }
  get presetId() { return this.preset; }

  beginDrag() { this.dragging = true; }
  endDrag(now: number) { this.dragging = false; this.lastInput = now; }
  get isDragging() { return this.dragging; }

  drag(dx: number, dy: number, now: number) {
    if (!this.opts.orbit) return;
    this.goal.az -= dx * 0.0062;
    this.goal.pol = MathUtils.clamp(this.goal.pol - dy * 0.0045, POL_MIN, POL_MAX);
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
    this.goal.dist = MathUtils.clamp(this.goal.dist * factor, this.height * 0.55, this.height * 3.4);
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

    // Slow idle drift + pointer parallax; both off for reduced motion.
    const drift = reduced ? 0 : Math.sin(now * 0.21) * 0.045;
    const par = reduced ? 0 : this.opts.parallax;
    const az = c.az + drift + pointer[0] * 0.07 * par;
    const pol = MathUtils.clamp(c.pol - pointer[1] * 0.035 * par, POL_MIN, POL_MAX);

    const aspect = camera.aspect;
    // Portrait viewports need more distance to keep the character inside the frame.
    const fit = aspect < 1 ? Math.min(2.1, Math.pow(1 / aspect, 0.8)) : 1;
    const d = c.dist * fit;
    const target = this.tmp.set(this.center.x, this.center.y + c.ty, this.center.z);
    camera.position.set(
      target.x + d * Math.sin(pol) * Math.sin(az),
      target.y + d * Math.cos(pol),
      target.z + d * Math.sin(pol) * Math.cos(az),
    );
    camera.lookAt(target);
    if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  }
}
