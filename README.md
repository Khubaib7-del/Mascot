# Mascot

A premium interactive 3D mascot playground (and future library). Characters are rendered in the browser with three.js (WebGL 2): procedural shell fur, plush/vinyl/metal surfaces, baked softbox lighting, layered procedural animation, and a data-driven customiser.

Read first: [`RESEARCH.md`](RESEARCH.md) (decisions and evidence), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ASSETS.md`](ASSETS.md).

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm run thumbs       # re-render public/thumbs/*.webp (headless Chrome, software GL is fine)
```

Query flags: `?quality=low|medium|high|ultra` overrides device detection.

Routes (hash-based, static-host friendly): `#/` home · `#/explore` · `#/mascot/:id` playground (`?c=` carries a shared look).

## Adding a mascot
1. Create `src/mascot/definitions/<id>.ts` (copy `moss.ts`; parts, palette, customisation, animations).
2. Register it in `src/mascot/registry.ts` and add a job in `scripts/render-thumbnails.mjs`.
3. `npm run thumbs`.
For a modelled GLB, set `source: { type: 'glb', … }` once the loader branch in `Stage.setMascot` is implemented (see ARCHITECTURE.md → Asset system).

## Dev tools (`scripts/`)
`render-thumbnails.mjs`, `pose-sheet.mjs <id> <clip> t1,t2` (deterministic animation frames), `verify-ui.mjs` (headless smoke test + screenshots), `contact-sheet.mjs`, `strip.mjs`. Headless Chrome without a GPU needs `VK_ICD_FILENAMES` pointing at its bundled SwiftShader ICD; the scripts do this.
