import {
  AdditiveBlending, BoxGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group,
  IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, ShaderMaterial,
  SphereGeometry, TorusGeometry, Vector3,
} from 'three';
import type { LightingDef } from '../lighting';
import {
  Tracker, canvasTex, clouds, fbm, floatingIsland, makeSky, noise2, particles, peak, rng, standard,
  type WorldContext, type WorldDef, type WorldRuntime,
} from './common';

const scale = (ctx: WorldContext) => ({ low: 0.35, medium: 0.6, high: 1, ultra: 1.3 })[ctx.quality.tier];

/** Shared wiring: fog colour + sky follow the lighting preset; per-world hooks do the rest. */
function assemble(tr: Tracker, g: Group, ctx: WorldContext, o: {
  sky?: ReturnType<typeof makeSky>; ownsFloor?: boolean; fog: number; light?: (l: LightingDef) => void; update?: (t: number, dt: number) => void;
}): WorldRuntime {
  return {
    group: g, ownsFloor: o.ownsFloor ?? true, fogDensity: o.fog,
    update: (t, dt) => o.update?.(ctx.reduced ? 0 : t, ctx.reduced ? 0 : dt),
    applyLighting(l) { o.sky?.apply(l); o.light?.(l); },
    dispose() { tr.dispose(); },
  };
}

function ledge(tr: Tracker, r: number, top = '#8d939f', side = '#575c6b', snowAmount = 0.18): Group {
  const g = new Group();
  const geo = new CylinderGeometry(r, r * 1.18, 0.7, 56, 6, false);
  geo.translate(0, -0.35, 0);
  const p = geo.getAttribute('position');
  const col: number[] = [];
  const tc = new Color(top), sc = new Color(side), snow = new Color('#f4f8ff'), c = new Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), n = fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + y * 2);
    const k = 1 + (n - 0.5) * 0.28;
    p.setXYZ(i, x * k, y + (y > -0.05 ? (fbm(x * 2, z * 2) - 0.5) * 0.025 : 0), z * k);
    const topness = y > -0.08 ? 1 : 0;
    c.copy(sc).lerp(tc, topness * 0.9 + 0.1 * n);
    if (topness) c.lerp(snow, Math.max(0, fbm(x * 1.4 + 9, z * 1.4) * 1.6 - 0.55) * snowAmount * 2);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = tr.mesh(geo, standard('#ffffff', 1, { vertexColors: true }));
  m.receiveShadow = true; m.castShadow = true;
  g.add(m);
  return g;
}

function mossTufts(tr: Tracker, n: number, r: number, seed: number): Mesh {
  const geo = tr.add(new SphereGeometry(1, 10, 8));
  const mat = tr.add(standard('#6f9a5e', 1));
  const mesh = new InstancedMesh(geo, mat, n);
  const rand = rng(seed), m = new Matrix4(), q = new Quaternion(), pos = new Vector3(), s = new Vector3();
  const col = new Color();
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, rad = r * (0.75 + rand() * 0.28);
    const sz = 0.05 + rand() * 0.1;
    pos.set(Math.cos(a) * rad, 0.01 + sz * 0.25, Math.sin(a) * rad);
    s.set(sz * 1.3, sz * 0.7, sz * 1.3);
    m.compose(pos, q, s); mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set('#6f9a5e').offsetHSL((rand() - 0.5) * 0.06, 0, (rand() - 0.5) * 0.1));
  }
  mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
}

// ------------------------------------------------------------------ mountain
export const mountain: WorldDef = {
  id: 'mountain', label: 'Mountain', note: 'Snowy peaks above a sea of cloud', defaultLighting: 'snowy',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const peaks: [number, number, number, number, number][] = [
      [-10, -28, 12, 8, 1], [9, -36, 19, 11, 2], [25, -30, 10, 7.5, 3], [-27, -42, 16, 11, 4],
      [-3, -64, 26, 16, 5], [40, -58, 19, 12, 6], [-48, -62, 22, 14, 7], [58, -78, 28, 16, 8],
    ];
    for (const [x, z, h, r, s] of peaks) { const m = peak(tr, h, r, s); m.position.set(x, -4.2, z); g.add(m); }
    const sea = clouds(tr, { count: Math.round(34 * k + 8), radius: [14, 70], y: [-5.5, -1.8], size: [18, 34], drift: 0.6, seed: 4 });
    const high = clouds(tr, { count: Math.round(10 * k + 3), radius: [30, 80], y: [6, 22], size: [20, 40], drift: 0.35, seed: 9 });
    g.add(sea.group, high.group);
    const isl = floatingIsland(tr, { r: 2.4, castle: true });
    isl.position.set(15, 9.5, -26); isl.rotation.z = 0.06; g.add(isl);
    const ld = ledge(tr, 2.15); g.add(ld);
    const moss = mossTufts(tr, Math.round(26 * k + 8), 2.0, 3); g.add(moss);
    const rocks = tr.add(new IcosahedronGeometry(1, 1)), rockMat = tr.add(standard('#767b8a', 1));
    for (const [x, z, s] of [[1.5, 0.9, 0.18], [-1.6, 0.5, 0.26], [0.4, -1.7, 0.2], [-0.5, 1.8, 0.12]] as number[][]) {
      const m = new Mesh(rocks, rockMat); m.position.set(x, s * 0.4, z); m.scale.set(s * 1.3, s * 0.8, s); m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const snow = particles({ count: Math.round(320 * k), extent: [16, 9, 12], base: [0, -1, 1], speed: 0.45, size: 0.03, color: '#ffffff', sway: 0.5, alpha: 0.85 }, tr, ctx.time, ctx.reduced);
    g.add(snow.obj);
    return assemble(tr, g, ctx, {
      sky, fog: 0.011,
      light(l) { const a = l.stars > 0.5 ? 0.15 : 0.55; sea.tint(l.sky.horizon, a); high.tint(l.sky.horizon, a); snow.uniforms.uColor.value.set(l.stars > 0.5 ? '#cfdcff' : '#ffffff'); },
      update(t) { sea.update(t); high.update(t); isl.position.y = 9.5 + Math.sin(t * 0.4) * 0.25; },
    });
  },
};

// ------------------------------------------------------------------ forest
export const forest: WorldDef = {
  id: 'forest', label: 'Forest', note: 'Sun shafts through the pines', defaultLighting: 'morning',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const ground = tr.mesh(new CylinderGeometry(7, 7.4, 0.5, 48), standard('#5f8f4a', 1));
    ground.position.y = -0.25; ground.receiveShadow = true; g.add(ground);
    const far = tr.mesh(new PlaneGeometry(240, 240), standard('#4d7a3e', 1)); far.rotation.x = -Math.PI / 2; far.position.y = -0.6; g.add(far);
    // trees
    const n = Math.round(70 * k + 16), rand = rng(21);
    const trunkGeo = tr.add(new CylinderGeometry(0.1, 0.16, 1, 8)), trunkMat = tr.add(standard('#6b4a35', 1));
    const coneGeo = tr.add(new ConeGeometry(1, 1.4, 10)), coneMat = tr.add(standard('#ffffff', 1));
    const trunks = new InstancedMesh(trunkGeo, trunkMat, n);
    const cones = [0, 1, 2].map(() => new InstancedMesh(coneGeo, coneMat, n));
    const m = new Matrix4(), q = new Quaternion(), p = new Vector3(), s = new Vector3(), col = new Color();
    for (let i = 0; i < n; i++) {
      let x = (rand() - 0.5) * 70, z = -6 - rand() * 52;
      if (Math.abs(x) < 3.5 && z > -12) x += x < 0 ? -5 : 5;
      const h = 3 + rand() * 4.5, w = 0.9 + rand() * 0.9;
      p.set(x, h * 0.5 - 0.5, z); s.set(1, h, 1); m.compose(p, q, s); trunks.setMatrixAt(i, m);
      cones.forEach((c, lv) => {
        p.set(x, h * (0.45 + lv * 0.3) - 0.2, z); const f = 1 - lv * 0.25; s.set(w * f * 1.3, h * 0.32 * f, w * f * 1.3);
        m.compose(p, q, s); c.setMatrixAt(i, m);
        c.setColorAt(i, col.set('#2f6b47').offsetHSL((rand() - 0.5) * 0.05, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.08 + lv * 0.02));
      });
    }
    trunks.castShadow = true; g.add(trunks, ...cones);
    cones.forEach((c) => { c.castShadow = true; });
    // grass tufts + mushrooms near the character
    const gn = Math.round(140 * k + 30), tuft = new InstancedMesh(tr.add(new ConeGeometry(0.035, 0.28, 5)), tr.add(standard('#6fa357', 1)), gn);
    for (let i = 0; i < gn; i++) {
      const a = rand() * Math.PI * 2, r = 0.6 + rand() * 5.8;
      p.set(Math.cos(a) * r, 0.12, Math.sin(a) * r); q.setFromAxisAngle(new Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), rand() * 0.5);
      s.set(1, 0.7 + rand() * 1.2, 1); m.compose(p, q, s); tuft.setMatrixAt(i, m);
    }
    q.identity(); g.add(tuft);
    const capGeo = tr.add(new SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), capMat = tr.add(standard('#d6513d', 0.8));
    const stemMat = tr.add(standard('#f1e6d2', 0.9)), stemGeo = tr.add(new CylinderGeometry(0.03, 0.04, 0.12, 8));
    for (const [x, z, sc] of [[1.3, 0.8, 1], [1.5, 0.5, 0.6], [-1.4, 1.1, 0.8]] as number[][]) {
      const cap = new Mesh(capGeo, capMat); cap.scale.set(0.12 * sc, 0.09 * sc, 0.12 * sc); cap.position.set(x, 0.12 * sc, z);
      const stem = new Mesh(stemGeo, stemMat); stem.scale.setScalar(sc); stem.position.set(x, 0.06 * sc, z);
      cap.castShadow = stem.castShadow = true; g.add(cap, stem);
    }
    // light shafts
    const shaftTex = canvasTex(64, 256, (c) => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,244,210,0.55)'); gr.addColorStop(1, 'rgba(255,244,210,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 256); }, tr);
    const shaftMat = tr.add(new MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false, opacity: 0.5 }));
    const shaftGeo = tr.add(new PlaneGeometry(2.4, 14));
    const shafts: Mesh[] = [];
    for (const [x, z, r] of [[-3, -5, 0.35], [2.5, -8, 0.3], [-7, -10, 0.4]] as number[][]) {
      const sh = new Mesh(shaftGeo, shaftMat); sh.position.set(x, 5, z); sh.rotation.z = r; g.add(sh); shafts.push(sh);
    }
    const flies = particles({ count: Math.round(90 * k), extent: [14, 4, 12], base: [0, 0.2, -1], speed: 0.06, size: 0.04, color: '#e8ff9a', sway: 1.2, additive: true, twinkle: 0.8 }, tr, ctx.time, ctx.reduced);
    g.add(flies.obj);
    return assemble(tr, g, ctx, {
      sky, fog: 0.028,
      light(l) { shaftMat.opacity = l.stars > 0.5 ? 0.08 : 0.5; shaftMat.color.set(l.sky.sun); flies.uniforms.uAlpha.value = l.stars > 0.5 ? 1 : 0.55; },
      update(t) { shafts.forEach((s, i) => { s.rotation.z += Math.sin(t * 0.2 + i) * 0.0002; }); },
    });
  },
};

// ------------------------------------------------------------------ fantasy
export const fantasy: WorldDef = {
  id: 'fantasy', label: 'Fantasy', note: 'Floating islands and a rainbow', defaultLighting: 'fantasy',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const home = floatingIsland(tr, { r: 2.3, grass: '#9fd18b' }); g.add(home);
    const others: [number, number, number, number, boolean][] = [[-9, 3, -14, 2.8, true], [10, 6.5, -20, 3.4, true], [-3, 11, -34, 4.2, true], [18, -1, -12, 1.6, false], [-17, 8, -26, 2.2, false]];
    const isl: Group[] = [];
    others.forEach(([x, y, z, r, castle], i) => { const s = floatingIsland(tr, { r, castle, grass: i % 2 ? '#a3d7a0' : '#9fd18b' }); s.position.set(x, y, z); g.add(s); isl.push(s); });
    const rb = new TorusGeometry(22, 0.7, 6, 80, Math.PI);
    const pos = rb.getAttribute('position'), cols: number[] = [], c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i)); c.setHSL(0.02 + ((r - 21.3) / 1.4) * 0.72, 0.8, 0.65); cols.push(c.r, c.g, c.b);
    }
    rb.setAttribute('color', new Float32BufferAttribute(cols, 3));
    const rainbow = tr.mesh(rb, tr.add(new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, fog: false, depthWrite: false })));
    rainbow.position.set(2, -6, -45); g.add(rainbow);
    const sea = clouds(tr, { count: Math.round(30 * k + 8), radius: [12, 70], y: [-9, -3], size: [18, 34], drift: 0.7, seed: 12 });
    g.add(sea.group);
    const sparks = particles({ count: Math.round(160 * k), extent: [18, 8, 12], base: [0, -0.5, 0], speed: -0.25, size: 0.05, color: '#fff2c8', sway: 0.6, additive: true, twinkle: 0.9 }, tr, ctx.time, ctx.reduced);
    g.add(sparks.obj);
    return assemble(tr, g, ctx, {
      sky, fog: 0.008,
      light(l) { sea.tint(l.sky.horizon, 0.6); rainbow.visible = l.stars < 0.5; },
      update(t, ) { sea.update(t); isl.forEach((s, i) => { s.position.y += Math.sin(t * 0.5 + i * 2) * 0.002; }); home.position.y = Math.sin(t * 0.6) * 0.012; },
    });
  },
};

// ------------------------------------------------------------------ beach
export const beach: WorldDef = {
  id: 'beach', label: 'Beach', note: 'Warm sand and slow surf', defaultLighting: 'sunset',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const sand = tr.mesh(new CylinderGeometry(6.5, 7, 0.5, 56), standard('#e8d4a6', 1)); sand.position.y = -0.25; sand.receiveShadow = true; g.add(sand);
    const seaU = {
      uTime: ctx.time, uShallow: { value: new Color('#6fd1c8') }, uDeep: { value: new Color('#1f6f9e') }, uSun: { value: new Color('#fff0d0') },
    };
    const seaMat = tr.add(new ShaderMaterial({
      uniforms: seaU, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.); }',
      fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uShallow, uDeep, uSun; varying vec3 vP;
        void main(){
          float d = clamp((-vP.z - 5.0) / 40.0, 0.0, 1.0);
          vec3 c = mix(uShallow, uDeep, pow(d, 0.5));
          float w = sin(vP.x * 1.3 + uTime * 0.8 + sin(vP.z * 0.6 + uTime * 0.3) * 2.0) * sin(vP.z * 1.7 - uTime * 0.6);
          c += uSun * smoothstep(0.82, 1.0, w) * 0.35 * (1.0 - d * 0.6);
          float foam = smoothstep(0.1, 0.0, abs(fract(-vP.z * 0.25 + uTime * 0.05) - 0.5) - 0.46) * (1.0 - d) * 0.8;
          gl_FragColor = vec4(c + foam, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const sea = new Mesh(tr.add(new PlaneGeometry(260, 160)), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.35, -90 + 6); g.add(sea);
    const cl = clouds(tr, { count: Math.round(14 * k + 5), radius: [30, 90], y: [8, 24], size: [24, 44], drift: 0.5, seed: 33 }); g.add(cl.group);
    const rocks = tr.add(new IcosahedronGeometry(1, 1)), rockMat = tr.add(standard('#8a8279', 1)), rand = rng(5);
    for (let i = 0; i < 7; i++) { const m = new Mesh(rocks, rockMat); const s = 0.12 + rand() * 0.3; m.scale.set(s * 1.4, s, s * 1.1); m.position.set((rand() - 0.5) * 8, s * 0.3, -2 - rand() * 3); m.castShadow = m.receiveShadow = true; g.add(m); }
    const shell = tr.add(new SphereGeometry(0.07, 10, 8)), shellMat = tr.add(standard('#f4cdbd', 0.6));
    for (const [x, z] of [[1.3, 1.0], [-1.2, 1.4], [0.5, 1.9]] as number[][]) { const m = new Mesh(shell, shellMat); m.scale.set(1.2, 0.5, 1); m.position.set(x, 0.03, z); g.add(m); }
    return assemble(tr, g, ctx, {
      sky, fog: 0.006,
      light(l) { cl.tint(l.sky.horizon, 0.5); seaU.uSun.value.set(l.sky.sun); const night = l.stars > 0.5; seaU.uShallow.value.set(night ? '#1d4a68' : '#6fd1c8'); seaU.uDeep.value.set(night ? '#0b1a33' : '#1f6f9e'); },
      update(t) { cl.update(t); },
    });
  },
};

// ------------------------------------------------------------------ sky / flight
export const flight: WorldDef = {
  id: 'sky', label: 'Flight', note: 'On the wing, above the clouds', defaultLighting: 'morning',
  build(ctx) {
    const tr = new Tracker(), g = new Group(), k = scale(ctx);
    const sky = makeSky(tr, ctx.time); g.add(sky.mesh);
    const white = tr.add(standard('#f4f6fa', 0.45)), accent = tr.add(standard('#3b5bdb', 0.5)), dark = tr.add(standard('#2a2f3a', 0.6));
    const plane = new Group();
    const wing = tr.mesh(new BoxGeometry(7.5, 0.16, 2.6), white); wing.position.set(0, -0.08, 0); wing.receiveShadow = wing.castShadow = true; plane.add(wing);
    const stripe = tr.mesh(new BoxGeometry(7.5, 0.005, 0.2), accent); stripe.position.set(0, 0.002, -0.5); plane.add(stripe);
    const tip = tr.mesh(new BoxGeometry(0.3, 0.5, 0.9), accent); tip.position.set(3.6, 0.2, 0.2); plane.add(tip);
    const fus = tr.mesh(new CapsuleGeometry(1.1, 12, 10, 24), white); fus.rotation.x = Math.PI / 2; fus.position.set(-4.3, 0.6, 0); fus.castShadow = true; plane.add(fus);
    const nose = tr.mesh(new SphereGeometry(0.45, 12, 8), accent); nose.position.set(-4.3, 0.6, 6.9); nose.scale.set(1.2, 1.2, 0.6); plane.add(nose);
    const eng = tr.mesh(new CylinderGeometry(0.42, 0.42, 1.5, 24), white); eng.rotation.x = Math.PI / 2; eng.position.set(-1.8, -0.55, 0.5); plane.add(eng);
    const prop = new Group(); prop.position.set(-1.8, -0.55, 1.3);
    for (let i = 0; i < 3; i++) { const b = tr.mesh(new BoxGeometry(0.1, 1.05, 0.03), dark); b.rotation.z = (i * Math.PI * 2) / 3; b.position.set(0, 0, 0); prop.add(b); }
    plane.add(prop);
    plane.rotation.y = 0.05; g.add(plane);
    const lo = clouds(tr, { count: Math.round(34 * k + 8), radius: [10, 70], y: [-9, -3.5], size: [18, 34], drift: 6, seed: 40 });
    const hi = clouds(tr, { count: Math.round(12 * k + 4), radius: [14, 60], y: [3, 14], size: [14, 30], drift: 10, seed: 41 });
    g.add(lo.group, hi.group);
    return assemble(tr, g, ctx, {
      sky, fog: 0.004,
      light(l) { lo.tint(l.sky.horizon, 0.45); hi.tint(l.sky.horizon, 0.45); },
      update(t) { lo.update(t); hi.update(t); prop.rotation.z = t * 25; plane.position.y = Math.sin(t * 0.7) * 0.02; },
    });
  },
};
void noise2;
