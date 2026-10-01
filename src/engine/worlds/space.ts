import {
  AdditiveBlending, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, RingGeometry,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry,
} from 'three';
import { Tracker, canvasTex, makeSky, particles, rng, standard, type WorldDef } from './common';

export const space: WorldDef = {
  id: 'space', label: 'Space', note: 'Platform among planets and nebulae', defaultLighting: 'night',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = ({ low: 0.35, medium: 0.6, high: 1, ultra: 1.3 })[ctx.quality.tier];
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const stars = particles({ count: Math.round(1400 * k), extent: [220, 110, 140], base: [0, -30, -75], speed: 0, size: 0.2, color: '#ffffff', twinkle: 0.7, alpha: 0.95 }, tr, ctx.time, ctx.reduced);
    g.add(stars.obj);
    const nebTex = (hue: string) => canvasTex(128, 128, (c) => {
      const r = rng(hue.charCodeAt(2) + hue.charCodeAt(4));
      for (let i = 0; i < 14; i++) { const x = 30 + r() * 68, y = 30 + r() * 68, rad = 20 + r() * 36, gr = c.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, hue + 'aa'); gr.addColorStop(1, hue + '00'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }
    }, tr);
    for (const [x, y, z, s, c] of [[-25, 12, -60, 70, '#8a5cff'], [30, 4, -70, 80, '#2fc6d8'], [5, 22, -85, 90, '#ff5fb0'], [-45, -8, -75, 60, '#4d7bff']] as [number, number, number, number, string][]) {
      const m = tr.add(new SpriteMaterial({ map: nebTex(c), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, opacity: 0.55 }));
      const sp = new Sprite(m); sp.position.set(x, y, z); sp.scale.set(s, s, 1); g.add(sp);
    }
    const planetTex = canvasTex(256, 128, (c) => { const r = rng(9); for (let y = 0; y < 128; y += 4) { c.fillStyle = `hsl(${18 + r() * 28} ${40 + r() * 30}% ${52 + r() * 22}%)`; c.fillRect(0, y, 256, 4); } }, tr);
    const planet = tr.mesh(new SphereGeometry(7, 48, 32), standard('#ffffff', 0.9, { map: planetTex })); planet.position.set(-16, 7, -38); g.add(planet);
    const ring = tr.mesh(new RingGeometry(9.5, 14, 80), tr.add(new MeshBasicMaterial({ color: '#e7c9a0', transparent: true, opacity: 0.45, side: DoubleSide, fog: false })));
    ring.position.copy(planet.position); ring.rotation.set(1.25, 0.2, 0.1); g.add(ring);
    const moon = tr.mesh(new SphereGeometry(1.6, 28, 20), standard('#cfd2dc', 1)); moon.position.set(14, 8, -28); g.add(moon);
    const rockGeo = tr.add(new IcosahedronGeometry(1, 1)), rockMat = tr.add(standard('#7b7e8c', 1));
    const rocks: Mesh[] = [], rr = rng(4);
    for (let i = 0; i < 9; i++) { const m = new Mesh(rockGeo, rockMat); const s = 0.2 + rr() * 0.7; m.scale.set(s, s * (0.7 + rr() * 0.5), s); m.position.set((rr() - 0.5) * 18, 0.5 + rr() * 6, -4 - rr() * 14); m.castShadow = true; g.add(m); rocks.push(m); }
    const plat = tr.mesh(new CylinderGeometry(2.2, 1.9, 0.3, 64), standard('#3a3f52', 0.45, { metalness: 0.5 })); plat.position.y = -0.15; plat.receiveShadow = plat.castShadow = true; g.add(plat);
    const rimMat = tr.add(new MeshBasicMaterial({ color: '#58f0ff', toneMapped: false }));
    const rim = tr.mesh(new TorusGeometry(2.12, 0.035, 8, 96), rimMat); rim.rotation.x = Math.PI / 2; g.add(rim);
    const dust = particles({ count: Math.round(100 * k), extent: [16, 7, 10], base: [0, -0.5, 0], speed: 0.05, size: 0.04, color: '#bfe8ff', sway: 0.8, additive: true, twinkle: 0.6 }, tr, ctx.time, ctx.reduced);
    g.add(dust.obj);
    return {
      group: g, ownsFloor: true, fogDensity: 0,
      update(t) {
        const tt = ctx.reduced ? 0 : t;
        planet.rotation.y = tt * 0.02;
        rocks.forEach((m, i) => { m.rotation.x = tt * 0.1 * (1 + i * 0.1); m.rotation.y = tt * 0.07; });
      },
      applyLighting(l) {
        sky.apply({ ...l, stars: 1, sky: { ...l.sky, top: '#04050c', horizon: '#0c1230', ground: '#04050a' } });
        rimMat.color.set(l.id === 'neon' ? '#ff4fd8' : '#58f0ff');
      },
      dispose() { tr.dispose(); },
    };
  },
};
