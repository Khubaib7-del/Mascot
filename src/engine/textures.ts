import { CanvasTexture, SRGBColorSpace } from 'three';
import { canvasTex, rng, type Tracker } from './worlds/common';

/** Grayscale iris: dark limbus, bright mid-ring with fibres, lit lower crescent. Multiplied by the iris colour. */
export function irisTexture(tr: Tracker): CanvasTexture {
  return canvasTex(256, 256, (c) => {
    const r = rng(11);
    c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256);
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, '#6a6a6a'); g.addColorStop(0.34, '#8a8a8a'); g.addColorStop(0.55, '#f0f0f0'); g.addColorStop(0.8, '#d2d2d2'); g.addColorStop(0.93, '#3a3a3a'); g.addColorStop(1, '#101010');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 128, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(128, 128, 120, 0, 7); c.clip();
    for (let i = 0; i < 140; i++) {
      const a = r() * Math.PI * 2, r0 = 36 + r() * 20, r1 = 100 + r() * 20;
      c.strokeStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.08 + r() * 0.12})`; c.lineWidth = 1 + r() * 2;
      c.beginPath(); c.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); c.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); c.stroke();
    }
    const crescent = c.createRadialGradient(128, 215, 0, 128, 215, 120);
    crescent.addColorStop(0, 'rgba(255,255,255,0.55)'); crescent.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = crescent; c.fillRect(0, 0, 256, 256);
    c.restore();
  }, tr);
}

/** Soft rose blush: alpha falls to zero well inside the disc so there is no visible edge. */
export function blushTexture(tr: Tracker): CanvasTexture {
  return canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }, tr);
}

void SRGBColorSpace;
