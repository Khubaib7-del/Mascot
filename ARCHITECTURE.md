# ARCHITECTURE

```
src/
  app/        router (hash), App shell, error boundary
  ui/         React chrome: pages, MascotViewer, controls, styles
  mascot/     data model (types), config (defaults/sanitise/encode), registry, definitions/*
  engine/     rendering & animation – no React imports
    stage.ts            renderer, lights, env, input, loop, quality, disposal
    mascotInstance.ts   definition + config → scene graph
    fur.ts              shell‑fur material patch
    surfaces.ts         surface presets (smooth/plush/fuzzy/furry/synthetic/metallic)
    environments.ts     lighting/IBL/backdrop data + PMREM baker
    camera.ts           camera rig + presets
    quality.ts          tiers, detection
    animation/          animator, clips, expressions
  thumb.ts    entry for thumbnail rendering (thumb.html)
scripts/      render-thumbnails.mjs, contact-sheet.mjs
```

## Rendering layer
`Stage` owns one `WebGLRenderer` per viewer (hero, customiser, playground are separate canvases; only visible ones render). It has no knowledge of React or of any particular mascot. Public API: `setMascot`, `applyConfig`, `play/stopClip`, `setCameraPreset`, `setQuality`, `capture`, `freeze`, `dispose`. Events (`frame`, `tier`, `clip`) flow out through a callback.

## Scene management
Scene = key + rim directional lights, hemisphere fill, PMREM environment, a `ShadowMaterial` ground, a contact‑shadow blob, and one `MascotInstance`. Replacing a mascot disposes the old instance first.

## Mascot system
`MascotDefinition` (see `src/mascot/types.ts`) is pure data:

```
Mascot → metadata (name, family, tagline, status)
       → source (procedural | glb{url, draco, meshopt, ktx2})
       → parts[] (shape, size, stretch, parent, role, finish, colour slot, furry, furMask, accessory)
       → palette + customization (colour controls, allowed surfaces, accessories)
       → animations[] / environments[]
       → framing (height, centre) – drives all camera presets
       → license + thumbnail + swatch
```
`MascotInstance` walks `parts`, builds geometry (non‑uniform stretch baked, normals transformed), picks a material by `finish`, and registers **roles** (`head`, `earL`, `eyeL`, `mouth`, …) that the animator drives. Nothing in `engine/` mentions Moss, Pip or Orbit. To add a mascot: write a definition (or, for GLB, implement the loader branch and map node names to roles) and add it to `registry.ts`; run `npm run thumbs`.

## Asset system
Current: procedural prototypes. Planned: `source.type === 'glb'` → `GLTFLoader` + `MeshoptDecoder` + `KTX2Loader`, then node‑name → role/accessory/slot mapping from a sidecar JSON in the definition. Pipeline in RESEARCH.md §6. Per‑mascot licence is in the definition and surfaced on cards.

## Material system
`finish` selects a fixed material (matte, gloss, eye, iris, glow, inner, highlight) or `surface`, which follows the user‑selected `SurfaceDef`. Surfaces with a `fur` spec enable the shell mesh for `furry` parts; others change PBR constants only. Colours come from slots (`body`, `accent`, `eye`, …) so customisation is data‑driven.

## Animation system
`Animator.update` builds target channel values (`role.prop`) every frame from layers:
1. **Clips** (data in `clips.ts`: offset + sin/hop/noise tracks, ease in/out weight).
2. **Idle:** breathing, weight shift, tail/antenna sway, head drift, ear flick, blink (double‑blink 18 %), eye saccades.
3. **Gaze:** pointer relative to the *head’s screen position*; eyes lead, head follows at ~⅓ strength.
4. **Hover/click:** ears perk and face brightens; click triggers `poke`.
5. **Expression:** `EXPRESSIONS` values smoothed then mapped to eye/mouth/brow/cheek/ear channels.
Channels go through **springs** (role‑specific stiffness/damping; ears/tail under‑damped) – this gives follow‑through and settling. Blink is applied after springs so it stays crisp. Missing roles are silently skipped, so mascots without brows/ears work unchanged. Reduced motion scales all of this down.

## Customisation system
`MascotConfig` = colours by slot, surface, accessories, expression, environment, camera. `defaultConfig`, `sanitizeConfig` (validates against the definition) and `encodeConfig/decodeConfig` (URL sharing) live in `mascot/config.ts`. The playground UI is generated from `definition.customization`.

## Camera system
Spherical rig; presets are in units of mascot height; exponential smoothing; drag/pinch/wheel/keyboard; hero mode springs back after 3 s; shortest‑path azimuth; portrait pull‑back; idle drift and pointer parallax (off for reduced motion).

## Environment system
Each `EnvironmentDef` has softbox panels (baked to PMREM on first use, cached), key/rim/fill lights, exposure, shadow strength, fur rim tint and a CSS backdrop gradient. Switching dims IBL, swaps, and restores; the viewer cross‑fades the CSS backdrop.

## UI layer
React pages (Home, Explore, Playground) and a single `MascotViewer` that lazily creates a `Stage` when scrolled into view, shows the poster until the first frame, and exposes loading / unsupported / error states with retry. Playground controls are real buttons/radiogroups.

## State management
No global store. Playground config is local React state mirrored into the URL (`#/mascot/:id?c=…`, `replaceState`); saved looks in `localStorage`. Frame‑rate state never touches React.

## Performance layer
Tiers (`quality.ts`), detection, adaptive downgrade, visibility pausing, DPR caps, shell scaling, 30 fps cap (LOW). Shell fur = one instanced draw per furry part.

## Asset loading & error handling
Posters first; engine chunk split (`three`); viewer failure states: *unsupported* (no WebGL 2 → poster + message), *error* (retry button). Route errors are caught by an error boundary. Unknown mascot ids show a 404.

## Disposal & lifecycle
`MascotViewer` effect cleanup → `Stage.dispose()` → instance dispose (geometries, materials, shell meshes) → PMREM targets → shadow map → blob texture → observers → input listeners → `forceContextLoss()`. Verified by navigating between routes in the headless run (no console errors).

## Future store architecture
Keep the definition as the contract. A catalog endpoint returns definitions + CDN GLB URLs + entitlement; the registry becomes async. Licence fields already exist; add `pricing`, `packs`, `creator`. Embeddable mascot = `Stage` + a definition + a config in an iframe/web component. No backend, auth or payments exist in this build.

## Testing notes
See README for commands. Automated: `tsc`, `vite build`. Visual: headless Chrome with SwiftShader (needs `VK_ICD_FILENAMES` – handled in `scripts/render-thumbnails.mjs`).
