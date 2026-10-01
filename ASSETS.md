# ASSETS & LICENCES

| Asset | Source | Licence | Redistributable | Notes |
|---|---|---|---|---|
| Moss, Pip, Orbit (geometry) | Procedurally generated in `src/mascot/definitions/*` | Project-owned original designs | Yes | **Prototype assets.** Placeholders for professionally modelled characters. |
| Thumbnails `public/thumbs/*.webp` | Rendered from the above by `npm run thumbs` | Project-owned | Yes | Regenerate whenever a definition or the renderer changes. |
| Lighting environments | Generated at runtime from softbox layouts (`engine/environments.ts`) | Project-owned | Yes | No HDRI files are shipped, so there is nothing to attribute. |
| Fonts: Fraunces, Inter | npm `@fontsource-variable/*` | SIL Open Font License 1.1 | Yes, with licence | Self-hosted by the bundler; keep the OFL text if fonts are copied elsewhere. |
| three.js | npm | MIT | Yes | |
| React / React DOM | npm | MIT | Yes | |

## Policy
1. No third-party model, texture, HDRI or audio is committed without a row above (source URL, licence, attribution, redistribution terms).
2. Research-only downloads live outside the repository (or under an ignored `research-assets/` folder) and are never imported by `src/`.
3. Every `MascotDefinition` carries `license` (holder, terms, assets). Cards show *Prototype* for non-production assets.
4. Design references (Meta Muse/Jolly, OpenAI Dots, xAI Grok Bot, …) informed analysis only; no shapes, palettes, logos or motion were copied.
