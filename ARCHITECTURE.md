# ARCHITECTURE

```
src/
  app/            hash router, App shell, error boundary
  ui/             React chrome only: pages, MascotViewer, controls, playground panel, styles
    playground/   Playground page, Panel (10 sections), presets
  mascot/         data model (types), config (defaults / sanitise / encode), registry, definitions/*
  engine/         rendering + animation — no React imports
    stage.ts            renderer, lights, input, loop, quality transactions, transitions, recovery
    mascotInstance.ts   definition + config → scene graph; attach nodes; props; halo; secondary motion
    fur.ts              shell-fur material (tufts, flow, curl, AA, sheen) + markings + contact AO
    blob.ts             SDF primitives, smooth union, surface-nets mesher, surface ray-march
    textures.ts         iris and blush textures
    surfaces.ts         14 surface presets
    lighting.ts         11 lighting presets + baked IBL
    camera.ts           camera rig (orbit, zoom, pan, 11 presets, push-in for transitions)
    quality.ts          tiers, device detection
    models.ts           ~40 original prop/charm models built from primitives
    accessories.ts      outfit pieces with attach points and swing definitions
    charms.ts           keychain rail
    agent.ts            29 agent states (expression, clip, props, status halo)
    animation/          animator, clips, expressions, movement
    worlds/             common helpers + outdoor / indoor / space worlds
  thumb.ts        deterministic still entry (thumb.html) for thumbnails and QA
scripts/          render-thumbnails, shots, pose-sheet, verify-ui, contact-sheet, strip
```

## Composable character

```
Character (MascotDefinition: pure data)
 ├── Body        parts[] — shape, stretch, parent, role, finish, colour slot
 ├── Face        eyes (sclera/iris/pupil/shine), mouth, brows, cheeks — roles driven by Params
 ├── Fur         FurProfile (length, density, fluff, softness, gravity, variation) + per-part multipliers + markings
 ├── Material    config.surface → SurfaceDef (fur spec + PBR constants)
 ├── Color       config.colors by slot (body, markings, eye, eye2, cheek, earInner, pad, + outfit slots)
 ├── Outfit      config.accessories → attach points on the body
 ├── Charms      config.charms (≤ 6) → charmRail attach point
 ├── Expression  config.expression → ExpressionValues (14)
 ├── Agent state config.agent → expression + clip loop + props + halo
 ├── Movement    Animator.playMovement(MovementDef) — path + gait, applied to the root
 ├── Props       placed from the agent state: hand mounts or table/world positions
 └── World       config.world + config.lighting
```

Everything above is resolved by `MascotInstance.applyConfig(config)`. `config` is the single source of truth and is what the URL, saved looks and thumbnails serialise.

## Rendering lifecycle and the quality bug

The earlier build recreated the whole renderer when quality changed; a failure left a blank canvas. The current rule: **the renderer is created once per viewer and never for settings.** Every change is staged:

```
Current working scene ──▶ attempt change ──▶ render one frame + check GL error / context
                                  │ success ─▶ commit
                                  └ failure ─▶ restore previous state, try next lower tier
                                               ultra → high → medium → low → safe mode (skin, no shader fur)
```

- `Stage.setQuality(tier)` → `tryTier`: applies DPR, shadows, shadow-map size, fur layer scale, rebuilds the world for the tier (build-then-swap: the old world stays until the new one exists), renders a frame, checks `getError()` and context state.
- `swapWorld` / `buildWorld`: a world that throws never replaces the current one.
- `renderer.debug.onShaderError` and `try/catch` around every frame feed `onFailure`: lower tier → safe mode → drop the world → keep the character.
- `webglcontextlost` is prevented and the loop pauses; `webglcontextrestored` rebuilds the PMREM cache and resumes. The poster is shown meanwhile.
- MSAA is fixed at context creation; if the preferred context fails, creation is retried without it.
- Progressive loading (never an empty scene): skin-only character on a veil → veil clears to reveal the world → fur layers ramp up over ~1 s.
- Adaptive downgrade (sustained >38 ms frames) uses the same transactional path.

Verified in `scripts/verify-ui.mjs`: user tier changes, a forced `getError` failure during a tier change, and a forced context loss/restore each leave the character on screen.

## Scene

One `Scene`: key + rim directional lights, hemisphere fill, PMREM environment, a world group, the mascot root(s), a contact-shadow blob and a camera-attached **veil** (a fog/cloud shader quad). `Stage.travel()` raises the veil while the camera pushes in, swaps the world/character at the peak, then clears the veil and plays an entrance — used on the landing page and for world changes in the playground.

Worlds (`engine/worlds`) are built from real geometry, instanced meshes, canvas textures, shader particles (snow, rain, fireflies, stars, bokeh) and a shared sky-dome shader. Each exposes `update`, `applyLighting`, `dispose`; a `Tracker` records every allocation so disposal is exhaustive. Lighting is independent of the world: a preset drives rig, exposure, IBL, sky, fog and sun colours.

## Character system

- **Roles** (`head`, `earL`, `eyeL`, `irisL`, `armL`, `legBL`, `tail`, `topknot`, …) are the contract between data and animation. A part declares a role; the animator drives it; missing roles are skipped. `roleAliases` lets a quadruped reuse biped clips (armL → legFL).
- **Face**: `Params` (eye size, iris, pupil, spacing, highlight, squint, heterochromia, head/body size) scale stored base transforms (`p0`, `s0`) so slider changes never compound.
- **Bodies** are `shape: 'blob'`: a list of ellipsoids and round cones smooth-unioned (and optionally subtracted, for ear hollows) and meshed once per spec. `surfaceZ()` ray-marches the same SDF so faces and accessories sit exactly on the skin. Limbs are separate parts (they animate) but are authored to overlap their neighbours, and the fur hides the seam.
- **Fur**: surface preset × character `FurProfile` × user sliders × per-part multiplier → shell uniforms. Strands live on a 3D lattice sampled at the base surface point; a coarser tuft lattice pulls strands together as they rise, gives each tuft its own length and tone, darkens the valleys between tufts and jitters the normal per tuft. Shells are swept along a flow field, anti-aliased analytically, and shaded with a sheen lobe. Wool adds a helical curl. Up to three length masks per part keep eyes and ear hollows bare. Markings (spots, rosettes, patches) are a one-cell-per-lattice procedural mask shared by the skin and every shell.
- **Contact AO**: each character lists up to six proxy spheres (`occluders`); their world positions are updated every frame and the skin and fur shaders darken where parts meet.

## Animation

`Animator.update` builds target channel values (`role.prop`) from layers — idle (breath, weight shift, saccades, ear flicks, blink), gait (walk/run/hop/fly/float), expression, a persistent **agent-state loop**, a one-shot clip — then drives them through springs (ears and tail under-damped). Movement paths are applied directly to the root so entrances don't lag. User scalars (motion energy, speed, blink speed) are inputs; reduced motion scales idle to 30 %, removes blinks/flicks/saccades and snaps camera moves.

## Accessories, charms, props

- Each mascot lists **attach points** (`head`, `face`, `neck`, `chest`, `back`, `handR/L`, `charmRail`) as a parent part + offset + scale. An accessory declares the points it needs; it is hidden for bodies that lack them.
- `SwingDef` describes secondary motion: a pivot, the reference point whose world velocity drives it, gain, stiffness, damping, lag. Scarf tails are a three-segment chain with increasing lag; the backpack bounces; badges and charms are pendulums with an ambient sway so nothing freezes.
- Charms hang from the rail with chained links. Props (laptop on a table, book at the chest, magnifier in hand) come from the active agent state and are mounted to hands or world positions scaled by the mascot's height.
- Models are original primitives. Anything that echoes a real mark is a generic symbol (commit-graph, arc-reactor-style emblem, shield-and-star), never a logo.

## State

No global store. The playground keeps one `MascotConfig` in React state, mirrored to the URL via `replaceState`; saved looks live in `localStorage`. Frame-rate state never touches React (FPS is sampled every ~700 ms).

## Performance

Tiers (`quality.ts`): DPR cap, fur layer scale, shadows, shadow-map size, MSAA, blob mesh resolution, 30 fps cap on low. Bright lighting presets are scaled (key 0.8×, environment 0.18×) so white coats keep their shading. Render only while visible; one live canvas per page region; instancing for trees, grass, buildings, keys; shell fur = one instanced draw per part; world particle counts scale with tier. Fur geometry uses 60 % segments. Posters (WebP renders) show first.

## Asset pipeline

Unchanged intent (RESEARCH.md §6): DCC → GLB → glTF-Transform (Meshopt, KTX2) → role/attach mapping sidecar. `source: { type: 'glb' }` is typed but not implemented.

## Future store

The definition is the contract: a catalog returns definitions + CDN URLs + entitlements; the registry becomes async. Licence fields exist; `pricing`, `packs`, `creator` would be added. An embeddable agent = `Stage` + definition + config in an iframe/web component.
