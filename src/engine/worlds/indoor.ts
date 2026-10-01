import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, RepeatWrapping, SphereGeometry, TubeGeometry,
  Vector3, TorusGeometry,
} from 'three';
import {
  Tracker, canvasTex, clouds, makeSky, particles, rng, standard, emissive,
  type WorldContext, type WorldDef, type WorldRuntime,
} from './common';
import type { LightingDef } from '../lighting';

const scale = (ctx: WorldContext) => ({ low: 0.35, medium: 0.6, high: 1, ultra: 1.3 })[ctx.quality.tier];

function assemble(tr: Tracker, g: Group, ctx: WorldContext, o: {
  sky?: ReturnType<typeof makeSky>; fog: number; light?: (l: LightingDef) => void; update?: (t: number, dt: number) => void;
}): WorldRuntime {
  return {
    group: g, ownsFloor: true, fogDensity: o.fog,
    update: (t, dt) => o.update?.(ctx.reduced ? 0 : t, ctx.reduced ? 0 : dt),
    applyLighting(l) { o.sky?.apply(l); o.light?.(l); },
    dispose() { tr.dispose(); },
  };
}

const glow = (tr: Tracker, color: string, size: number) => {
  const tex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }, tr);
  return tr.mesh(new PlaneGeometry(size, size), tr.add(new MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false })));
};

// ------------------------------------------------------------------ studio
export const studio: WorldDef = {
  id: 'studio', label: 'Studio', note: 'Seamless cyclorama and softboxes', defaultLighting: 'studio',
  build(ctx) {
    const tr = new Tracker(), g = new Group();
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    // Floor → coved wall profile, extruded along X.
    const prof: [number, number][] = [];
    for (let z = 9; z >= -3; z -= 0.5) prof.push([z, 0]);
    for (let a = 0; a <= 90; a += 6) { const r = 3, t = (a * Math.PI) / 180; prof.push([-3 - Math.sin(t) * r, r - Math.cos(t) * r]); }
    prof.push([-6, 14]);
    const W = 40, pos: number[] = [], idx: number[] = [];
    prof.forEach(([z, y], i) => { pos.push(-W / 2, y, z, W / 2, y, z); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
    const geo = tr.add(new BufferGeometry());
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const cyc = tr.mesh(geo, standard('#e4e1da', 0.95, { side: DoubleSide })); cyc.receiveShadow = true; g.add(cyc);
    const ped = tr.mesh(new CylinderGeometry(1.7, 1.78, 0.1, 64), standard('#f3f1ec', 0.7)); ped.position.y = -0.05; ped.receiveShadow = true; g.add(ped);
    const box = tr.add(new BoxGeometry(0.2, 5, 2)), boxMat = tr.add(emissive('#ffffff', 2.2));
    for (const x of [-6.5, 6.5]) { const b = new Mesh(box, boxMat); b.position.set(x, 2.8, -3.5); g.add(b); }
    return assemble(tr, g, ctx, {
      sky, fog: 0.0,
      light(l) {
        cyc.material.color.set(l.sky.horizon).lerp(new Color('#ffffff'), 0.2).multiplyScalar(l.ui === 'dark' ? 0.5 : 1);
        boxMat.emissive.set(l.key.color); boxMat.emissiveIntensity = l.ui === 'dark' ? 3 : 1.6;
        ped.material.color.set(l.ui === 'dark' ? '#4a4a52' : '#f3f1ec');
      },
    });
  },
};

// ------------------------------------------------------------------ developer desk
export const devDesk: WorldDef = {
  id: 'devDesk', label: 'Developer desk', note: 'Monitor glow and tangled cables', defaultLighting: 'indoor',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const wood = canvasTex(256, 256, (c) => {
      c.fillStyle = '#8a6244'; c.fillRect(0, 0, 256, 256); const r = rng(3);
      for (let i = 0; i < 90; i++) { c.strokeStyle = `rgba(${40 + r() * 40},${20 + r() * 30},10,${0.08 + r() * 0.12})`; c.lineWidth = 1 + r() * 2; c.beginPath(); const y = r() * 256; c.moveTo(0, y); c.bezierCurveTo(80, y + (r() - 0.5) * 12, 170, y + (r() - 0.5) * 12, 256, y + (r() - 0.5) * 8); c.stroke(); }
    }, tr);
    wood.wrapS = wood.wrapT = RepeatWrapping; wood.repeat.set(3, 1);
    const desk = tr.mesh(new BoxGeometry(9, 0.2, 4), standard('#ffffff', 0.55, { map: wood })); desk.position.set(0, -0.1, -0.4); desk.receiveShadow = true; desk.castShadow = true; g.add(desk);
    const wall = tr.mesh(new PlaneGeometry(60, 30), standard('#23262f', 1)); wall.position.set(0, 8, -6); wall.receiveShadow = true; g.add(wall);
    const code = canvasTex(512, 1024, (c) => {
      c.fillStyle = '#10141c'; c.fillRect(0, 0, 512, 1024); const r = rng(11);
      const pal = ['#7fd4ff', '#ffb86b', '#b6f08a', '#e39bff', '#8896b3'];
      for (let y = 20; y < 1024; y += 26) { let x = 24 + Math.floor(r() * 3) * 28; const n = 2 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const w = 20 + r() * 90; c.fillStyle = pal[Math.floor(r() * pal.length)]; c.globalAlpha = 0.85; c.fillRect(x, y, w, 10); x += w + 10; if (x > 440) break; } }
      c.globalAlpha = 1;
    }, tr);
    code.wrapS = code.wrapT = RepeatWrapping; code.repeat.set(1, 0.5);
    const bezel = tr.mesh(new BoxGeometry(3.7, 2.15, 0.12), standard('#15171c', 0.4)); bezel.position.set(0.3, 1.55, -1.7); bezel.castShadow = true; g.add(bezel);
    const screen = tr.mesh(new PlaneGeometry(3.5, 1.95), tr.add(new MeshBasicMaterial({ map: code, toneMapped: false }))); screen.position.set(0.3, 1.55, -1.63); g.add(screen);
    const stand = tr.mesh(new BoxGeometry(0.25, 0.7, 0.16), standard('#2a2d35', 0.4)); stand.position.set(0.3, 0.3, -1.75); g.add(stand);
    const foot = tr.mesh(new BoxGeometry(1.2, 0.06, 0.7), standard('#2a2d35', 0.4)); foot.position.set(0.3, 0.03, -1.7); g.add(foot);
    const halo = glow(tr, '#7fb4ff', 7); halo.position.set(0.3, 1.55, -1.55); g.add(halo);
    const kb = new Group(); kb.position.set(-2.1, 0.04, 1.1); kb.rotation.y = 0.2;
    kb.add(tr.mesh(new BoxGeometry(2.0, 0.07, 0.7), standard('#2e3139', 0.5)));
    const keys = new InstancedMesh(tr.add(new BoxGeometry(0.13, 0.05, 0.13)), tr.add(standard('#cfd3dc', 0.5)), 60);
    const mm = new Matrix4();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) { mm.setPosition(-0.92 + c * 0.132, 0.06, -0.24 + r * 0.16); keys.setMatrixAt(r * 15 + c, mm); }
    kb.add(keys); g.add(kb);
    const mug = tr.mesh(new CylinderGeometry(0.2, 0.17, 0.34, 20), standard('#e9e2d3', 0.5)); mug.position.set(2.5, 0.17, 0.4); mug.castShadow = true; g.add(mug);
    const handle = tr.mesh(new TorusGeometry(0.1, 0.03, 8, 16), standard('#e9e2d3', 0.5)); handle.position.set(2.7, 0.18, 0.4); g.add(handle);
    const pot = tr.mesh(new CylinderGeometry(0.28, 0.22, 0.4, 16), standard('#c8785a', 0.9)); pot.position.set(3.4, 0.2, -1.2); pot.castShadow = true; g.add(pot);
    const leafGeo = tr.add(new SphereGeometry(1, 10, 8)), leafMat = tr.add(standard('#5f9a5a', 0.8));
    for (let i = 0; i < 7; i++) { const l = new Mesh(leafGeo, leafMat); const a = i * 0.9; l.scale.set(0.1, 0.34, 0.05); l.position.set(3.4 + Math.cos(a) * 0.12, 0.65, -1.2 + Math.sin(a) * 0.12); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); l.castShadow = true; g.add(l); }
    const arm = tr.mesh(new CylinderGeometry(0.03, 0.03, 1.5, 8), standard('#2a2d35', 0.4)); arm.position.set(-3.3, 0.75, -1.4); arm.rotation.z = -0.25; g.add(arm);
    const lampHead = tr.mesh(new ConeGeometry(0.28, 0.4, 20, 1, true), standard('#2a2d35', 0.5, { side: DoubleSide })); lampHead.position.set(-3.0, 1.6, -1.4); lampHead.rotation.z = 1.9; g.add(lampHead);
    const bulb = glow(tr, '#ffc27a', 2.4); bulb.position.set(-2.85, 1.45, -1.3); g.add(bulb);
    const tube = (pts: Vector3[]) => { const t = tr.mesh(new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.025, 6), standard('#101114', 0.7)); t.castShadow = true; g.add(t); };
    tube([new Vector3(0.3, 0.7, -1.8), new Vector3(0.6, 0.2, -2.2), new Vector3(1.2, 0.0, -1.5), new Vector3(1.9, 0.0, -0.6), new Vector3(2.1, 0.02, 0.5)]);
    tube([new Vector3(-1.1, 0.07, 1.0), new Vector3(-0.2, 0.02, 0.2), new Vector3(0.6, 0.0, -1.2), new Vector3(0.45, 0.4, -1.8)]);
    const bokeh = particles({ count: Math.round(50 * k + 12), extent: [24, 9, 4], base: [0, 2, -5], speed: 0.03, size: 0.55, color: '#ffbf80', sway: 0.2, additive: true, twinkle: 0.7, alpha: 0.28 }, tr, ctx.time, ctx.reduced);
    g.add(bokeh.obj);
    return assemble(tr, g, ctx, {
      sky, fog: 0.0,
      light(l) { wall.material.color.set(l.ui === 'dark' ? '#1b1d25' : '#8d8f98'); },
      update(t) { code.offset.y = (t * 0.03) % 1; },
    });
  },
};

// ------------------------------------------------------------------ city
export const city: WorldDef = {
  id: 'city', label: 'City', note: 'Rainy rooftop, neon skyline', defaultLighting: 'neon',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const roof = tr.mesh(new BoxGeometry(5.2, 0.7, 4.2), standard('#3b3d47', 0.9)); roof.position.set(0, -0.35, 0); roof.receiveShadow = true; g.add(roof);
    const rim = tr.mesh(new BoxGeometry(5.3, 0.12, 0.14), standard('#555865', 0.8)); rim.position.set(0, 0.06, -2.05); rim.castShadow = true; g.add(rim);
    const win = canvasTex(64, 128, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 128); const r = rng(5); for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) if (r() > 0.55) { c.fillStyle = r() > 0.7 ? '#ffd9a0' : '#9fd4ff'; c.fillRect(x, y, 4, 5); } }, tr);
    const n = Math.round(80 * k + 20), rand = rng(17);
    const bm = tr.add(standard('#2c2f3b', 0.9, { emissive: new Color('#ffffff'), emissiveMap: win, emissiveIntensity: 1.2 }));
    const buildings = new InstancedMesh(tr.add(new BoxGeometry(1, 1, 1)), bm, n);
    const m = new Matrix4(), q = new Quaternion(), p = new Vector3(), s = new Vector3(), col = new Color();
    for (let i = 0; i < n; i++) {
      const h = 4 + rand() * 22, w = 1.6 + rand() * 2.6;
      p.set((rand() - 0.5) * 70, h / 2 - 3, -9 - rand() * 36); s.set(w, h, w); m.compose(p, q, s); buildings.setMatrixAt(i, m);
      buildings.setColorAt(i, col.set('#2c2f3b').offsetHSL((rand() - 0.5) * 0.1, 0, (rand() - 0.5) * 0.08));
    }
    g.add(buildings);
    const signs: { m: Mesh; c: string }[] = [];
    for (const [x, y, z, w, h, c] of [[-4.5, 3, -7, 1.6, 0.5, '#ff3fd0'], [5, 4.6, -9, 2.2, 0.6, '#2fe6ff'], [-9, 6.5, -14, 1.2, 1.6, '#ffd24a']] as [number, number, number, number, number, string][]) {
      const sm = tr.mesh(new PlaneGeometry(w, h), tr.add(new MeshBasicMaterial({ color: c, toneMapped: false, fog: false })));
      sm.position.set(x, y, z); g.add(sm);
      const gl = glow(tr, c, Math.max(w, h) * 4); gl.position.set(x, y, z + 0.05); g.add(gl); signs.push({ m: sm, c });
    }
    const rain = particles({ count: Math.round(420 * k), extent: [22, 13, 16], base: [0, -1, 0], speed: 8, size: 1, color: '#a9c1ee', alpha: 0.45, streak: 0.4 }, tr, ctx.time, ctx.reduced);
    g.add(rain.obj);
    return assemble(tr, g, ctx, {
      sky, fog: 0.02,
      light(l) { const night = l.ui === 'dark'; bm.emissiveIntensity = night ? 1.5 : 0.25; rain.uniforms.uColor.value.set(night ? '#a9c1ee' : '#8aa2c8'); },
      update(t) { signs.forEach((s, i) => { (s.m.material as MeshBasicMaterial).color.set(s.c).multiplyScalar(0.85 + 0.15 * Math.sin(t * (2 + i) + i)); }); },
    });
  },
};

// ------------------------------------------------------------------ office
export const office: WorldDef = {
  id: 'office', label: 'Office', note: 'Daylit room with plants', defaultLighting: 'soft',
  build(ctx) {
    const tr = new Tracker(), g = new Group();
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const floor = tr.mesh(new BoxGeometry(16, 0.3, 14), standard('#b9916b', 0.7)); floor.position.set(0, -0.15, -2); floor.receiveShadow = true; g.add(floor);
    const rug = tr.mesh(new CylinderGeometry(2.4, 2.4, 0.03, 48), standard('#d8d3ea', 1)); rug.position.y = 0.015; rug.receiveShadow = true; g.add(rug);
    const wall = tr.mesh(new PlaneGeometry(16, 8), standard('#efeae2', 1)); wall.position.set(0, 4, -6); wall.receiveShadow = true; g.add(wall);
    const frame = tr.mesh(new BoxGeometry(6.2, 3.6, 0.15), standard('#d9d3c7', 0.6)); frame.position.set(0.5, 3.2, -5.9); g.add(frame);
    const view = tr.mesh(new PlaneGeometry(5.8, 3.2), tr.add(new MeshBasicMaterial({ color: '#cfe4ff', toneMapped: false, fog: false }))); view.position.set(0.5, 3.2, -5.8); g.add(view);
    const cl = clouds(tr, { count: 6, radius: [5, 8], y: [3, 4], size: [3, 5], drift: 0.3, seed: 2 }); cl.group.position.set(0.5, 0, -5.7); cl.group.scale.setScalar(0.35); g.add(cl.group);
    const desk = tr.mesh(new BoxGeometry(3.4, 0.12, 1.3), standard('#f1ebe0', 0.6)); desk.position.set(-3.8, 1.0, -3.2); desk.castShadow = desk.receiveShadow = true; g.add(desk);
    for (const dx of [-1.55, 1.55]) { const leg = tr.mesh(new BoxGeometry(0.08, 1, 0.08), standard('#3a3a40', 0.5)); leg.position.set(-3.8 + dx, 0.5, -3.2); leg.castShadow = true; g.add(leg); }
    const mon = tr.mesh(new BoxGeometry(1.1, 0.7, 0.05), standard('#202228', 0.4)); mon.position.set(-3.8, 1.55, -3.4); g.add(mon);
    const sc = tr.mesh(new PlaneGeometry(1.0, 0.6), tr.add(new MeshBasicMaterial({ color: '#8fc4ff', toneMapped: false }))); sc.position.set(-3.8, 1.55, -3.37); g.add(sc);
    const leafGeo = tr.add(new SphereGeometry(1, 10, 8)), leafMat = tr.add(standard('#5c9a58', 0.8)), potMat = tr.add(standard('#f2efe8', 0.7)), potGeo = tr.add(new CylinderGeometry(0.34, 0.26, 0.6, 20));
    for (const [x, z, sc2] of [[3.6, -2.2, 1.3], [-6, -1.4, 1], [5.4, -4.6, 1.7]] as number[][]) {
      const pot = new Mesh(potGeo, potMat); pot.scale.setScalar(sc2); pot.position.set(x, 0.3 * sc2, z); pot.castShadow = true; g.add(pot);
      for (let i = 0; i < 9; i++) { const l = new Mesh(leafGeo, leafMat); const a = i * 0.7; l.scale.set(0.16 * sc2, 0.55 * sc2, 0.07 * sc2); l.position.set(x + Math.cos(a) * 0.2 * sc2, 0.95 * sc2, z + Math.sin(a) * 0.2 * sc2); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); l.castShadow = true; g.add(l); }
    }
    return assemble(tr, g, ctx, {
      sky, fog: 0.0,
      light(l) {
        const dark = l.ui === 'dark';
        wall.material.color.set(dark ? '#3a3a44' : '#efeae2'); floor.material.color.set(dark ? '#4a3c30' : '#b9916b');
        (view.material as MeshBasicMaterial).color.set(l.sky.horizon).lerp(new Color(l.sky.top), 0.4);
      },
      update() { cl.update(0); },
    });
  },
};
