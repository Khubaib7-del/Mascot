# RESEARCH

Status legend: **[verified]** = read from a primary or current source during this project (searches dated 2026‑10‑01) or measured in this repo; **[background]** = established knowledge not re‑checked today; **[assumption]** = reasoned, untested.

## 1. Competitive references

What was actually retrieved this week:

| Reference | What the sources say | Source |
|---|---|---|
| **Meta Muse / “Jollybot”** | Fuzzy, rosy‑cheeked, plush‑looking mascot; designed by Muse product design lead Alex Cornell. Users customise name, appearance and style “with matching animations”; Meta’s design team called personalisation “critical to the product”. The character originated from the question “how do you show users what an agent is doing while it works?”. Worn clothing (toga, headphones, gym gear) is a recurring marketing device; a Tamagotchi‑style device is planned. WIRED describes it as “Labubu‑adjacent”, “kawaii‑coded”. | Axios 2026‑09‑25; WIRED 2026‑09‑26 **[verified]** |
| **OpenAI Dots** | Launched at DevDay (2026‑09‑29). “Cute, little AI assistant”, colourful cuddly faces; can be styled as an “O” or a “Pet”. Commentary: more like Grok Bot and Microsoft’s Copilot blob than Muse. | Spyglass 2026‑09‑30 **[verified, secondary]** |
| **Grok Bot** | xAI design post frames Bot as a *persistent* agent with presence, a roster, its own computer, work that starts without a prompt. The article is about interaction primitives (presence, progress), not rendering. | x.ai 2026‑09‑03 **[verified]** |
| **CopilotKit OpenMuse** | MIT‑licensed, alpha, self‑hostable *agent app* (chat, browser, tasks, AG‑UI). It has “avatar” as a personal‑context setting but is **not** a mascot renderer. Not a rendering reference. | copilotkit.ai/openmuse, kody.codes **[verified]** |

What I could **not** verify: the exact rendering technology behind Jollybot or Dots (offline‑rendered video, real‑time engine, or 2D art). No source retrieved said. Anything below about their “surface treatment” is observation of public imagery as described in press, not engineering fact.

### What the pattern implies (observation → inference)
- **Observation:** all three lean on soft, rounded, high‑contrast‑eye characters; two explicitly use fuzz/plush. **Inference:** tactile softness is the shared signal of “friendly agent”, so surface (fur/fabric) is the highest‑value rendering problem, not geometry.
- **Observation:** Muse treats *customisation* as core, and shows state through the character (“what the agent is doing while it works”). **Inference:** the data model must make colour/surface/accessory/expression first‑class and the animation system must be able to express *state*, not just loops. Our expression + clip layering is built for that.
- **Observation:** press coverage flags the “kids’ toy” aesthetic as a brand risk. **Inference:** our own characters should vary family (soft, plush, synthetic) so the platform is not locked to one infantilising look.
- **[assumption]** Premium feel comes from (a) silhouette softness, (b) eyes with real specular depth, (c) micro‑motion that never fully stops, (d) restrained lighting. We designed to those four and checked (a)–(b) in renders.

We do not copy any character shape, palette, or motion from the above. Moss/Pip/Orbit are original.

## 2. Open‑source references

Retrieved: **[verified]** for licence/version; the rest is **[background]**.

| Project | What it does | Render / format | Licence | Reuse verdict |
|---|---|---|---|---|
| **three.js** | Core 3D library. `WebGPURenderer` with automatic WebGL 2 fallback, TSL shading language, node materials. Latest on npm today: 0.186.x | WebGL2 / WebGPU | MIT | **Used** (r186, WebGLRenderer). |
| **@pixiv/three-vrm** (v3.5.5) | Loads VRM avatars; MToon toon material, spring bones, expression/blendshape manager, node constraints. Works with WebGPURenderer. | glTF + VRM ext. | MIT | **Not used now.** Right choice if we later accept VRM downloads/uploads; its expression manager is a good model for ours. Humanoid‑biased, so it is the wrong *core* for non‑humanoid mascots. |
| **glTF‑Transform** (CLI v4.5) | Scriptable glTF pipeline: `optimize`, `resize`, `meshopt`, `draco`, `uastc`/`etc1s` (KTX2), `inspect`, `validate`. Meshopt “offers very fast runtime decompression… appropriate for models of any size”; compression should be the *last* step, keep originals (lossy). | glTF/GLB | MIT | **Adopted as the production asset pipeline** (§5). |
| **Shell‑fur demos / papers** (Lengyel 2001 “shells and fins”; NVIDIA Fur white paper; Isidoro & Mitchell “User customizable real‑time fur”; “Real‑time High Quality Fur Rendering… on Mobile Devices”) | Shells = concentric alpha‑tested extrusions of the mesh. Fins fix silhouettes. Strand rendering is high quality but needs hundreds of thousands of strands and suffers aliasing. Mobile research optimises shell models rather than going to strands. | Raster | Papers | **Technique adopted**; code written from scratch. No code copied. |
| **Babylon.js** | Full engine with inspector, node material editor, glTF + KTX2, WebGPU. | WebGL2/WebGPU | Apache‑2.0 | Evaluated, not chosen (§4). |
| **react‑three‑fiber / drei** | React renderer for three. | WebGL/WebGPU | MIT | Evaluated, not chosen (§4). |
| **Ready Player Me / VRoid / Character Creator tools** | Human avatar creators. | glTF/VRM | mixed/proprietary | Explicitly out of scope: this is the “generic avatar editor” we are avoiding. Architectural inspiration only for the customisation UX. |

I did not run a systematic GitHub star/licence survey of every fur or character‑configurator repo; I cite only projects whose behaviour and licence I could confirm. Anything copied from a third party would need a licence line in `ASSETS.md`; currently nothing is.

## 3. Rendering analysis: WebGL vs WebGPU

Facts **[verified]** from the three.js manual/docs: `WebGPURenderer` tries WebGPU and falls back to a WebGL 2 backend; it is initialised asynchronously; custom materials use TSL/node materials rather than `onBeforeCompile` GLSL; there is an open upstream PR (#34334, Aug 2026) to split the WebGL fallback into a separately loaded entry, i.e. the fallback packaging is still moving. Browser table (caniuse mirror, retrieved today) shows WebGPU shipped in Chrome/Edge 113+, Firefox 141+, Safari 26+ (with caveats); older Safari/Firefox and many Android WebViews remain WebGL 2 only. Treat exact versions as **[verified, secondary]**.

| Option | Verdict |
|---|---|
| **A. three.js + WebGLRenderer** | **Chosen.** Universal support (WebGL 2 is effectively everywhere), mature shadows/PMREM/physical materials, simple GLSL injection for the fur shader, most documentation. |
| **B. three.js + WebGPU/TSL** | Deferred. Gains are real for *compute* (GPU particles, strand sim) and for avoiding draw overhead, but our critical path is fragment cost on shells, which WebGPU does not fix. Fallback packaging is in flux and the TSL material path would rewrite the fur shader. Revisit when we need compute (strand hair, fluid fabric) – the engine is isolated behind `Stage`/`MascotInstance` so the renderer can be swapped. |
| **C. React Three Fiber** | Rejected for the core. R3F is excellent for scene‑in‑React apps; here the 3D part has an imperative, long‑lived animation/camera/quality loop that should not re‑render with React state, and we must dispose precisely. React is used only for chrome. |
| **D. Babylon.js** | Rejected. Better tooling out of the box, but larger bundle, different ecosystem for the shell/fur experiments we want, and weaker alignment with glTF‑Transform/three workflows we already depend on. Would be a valid alternative for a team that wants a node‑material editor. |
| **E. Other** (PlayCanvas, raw WebGL, Unity/Unreal WebGL export, pre‑rendered video/Lottie/Rive) | Unity/Unreal exports are tens of MB and un‑embeddable. Pre‑rendered video can’t be customised. Rive/Lottie are 2D. Rejected. |

Decision basis: reach (WebGL 2), bundle (three chunk is **135 KB gzip**, measured), and the fact that the hard problem is surface shading, which is renderer‑independent.

## 4. Fur / soft‑surface analysis

Approaches considered, evaluated for the browser:

| Approach | Look | GPU cost | Mobile | Assets | Complexity | Verdict |
|---|---|---|---|---|---|---|
| Normal/bump map on a mesh | Flat fuzz; no silhouette | trivial | great | needs textures | low | Baseline only (the `smooth` surface). |
| **Shell fur** (stacked extruded shells, alpha‑tested) | Dimensional, soft silhouette, parallax from any angle | N shells × fragment cost; overdraw heavy | OK at 8–12 shells; poor at 30+ on high DPR | none if procedural | medium | **Chosen**, procedural, quality‑scaled. |
| Shells + fins | Fixes grazing‑angle gaps | needs geometry shader or CPU silhouette extraction (WebGL has no GS) | – | – | high | Skipped: the extruded outline of 30 shells already hides gaps at the angles our camera allows. |
| Strand geometry / particle hair | Best close up | 100k–1M strands, aliasing, CPU/GPU sim | Poor | needs groom | very high | Rejected for v1; would suit WebGPU compute later. |
| Hair cards | Good for long hair, not fuzz | cheap | good | needs authored cards + atlas | high (authoring) | Rejected: wrong look for fuzz. |
| Baked groom textures | Pretty stills | cheap | great | big textures | medium | Used conceptually for thumbnails (we bake renders, not grooms). |
| Anisotropic hair (Kajiya‑Kay) | Specular on strands | per‑pixel | OK | needs tangents | medium | Rejected: fuzz is diffuse‑dominated; approximated with a fresnel rim term. |

**Selected hybrid (implemented in `src/engine/fur.ts`):**
1. Opaque **core mesh** underneath (darkened skin, casts shadows, hit‑tests).
2. **Shells** as a single `InstancedMesh` per part; `gl_InstanceID` = layer, so one draw call per furry part regardless of layer count. `onBeforeCompile` patches `MeshStandardMaterial`, so lights, IBL, shadows and tone mapping come for free.
3. **Procedural strands:** a jittered 3D lattice sampled at the *undisplaced* surface point (so a strand has one identity across layers); radius tapers with height; random truncation gives uneven tips. No UVs → no seams or pole pinching. A fixed oblique rotation of the lattice removes moiré on flat patches (found in review: concentric rings on Moss’s belly).
4. **Shading cheats that matter:** root darkening (fake ambient occlusion), per‑strand brightness variation, fresnel backscatter rim tinted by the environment, gravity sag and subtle sway on upper layers.
5. **Face mask:** fur length fades to ~20 % inside an ellipsoid so eyes/brows/mouth stay readable without a hard bare patch.
6. **Quality scaling:** layers × tier (0.3 / 0.55 / 1 / 1.4); fur meshes use 60 % sphere segments since silhouette only needs low‑poly.

Measured in headless SwiftShader (CPU rasteriser, so *relative* numbers only) at ULTRA, full Moss with furry surface: 35 draw calls, ~0.98 M triangles after the segment reduction (it was 2.86 M before; that regression was caught in review). **Not measured: real GPU frame times on desktop/mobile hardware** – there is no GPU in this environment. The tier table is therefore a reasoned estimate (**[assumption]**) with adaptive downgrading at runtime as the safety net.

Known limitations: strands read slightly “spiky” at ULTRA on dark rim areas; no self‑shadowing between shells; gravity is object‑space; very close inspection shows lattice regularity.

## 5. Material quality – what we used and what we skipped

Used (each justified by the renders): PBR `MeshPhysicalMaterial` with **clearcoat** for eyes and synthetic shells; **sheen** on smooth vinyl; **PMREM image‑based lighting** built at runtime from emissive softbox layouts (no HDRI files, so no licence or download cost); **Khronos PBR Neutral tone mapping** to keep brand colours from desaturating; PCF shadows from a key light plus a **radial contact blob** that shrinks when the character hops; rim light per environment; per‑environment exposure.

Skipped on purpose: SSAO/SSR/DOF/bloom (post chain costs a full‑res pass on mobile and the shells already supply occlusion cues), transmission/SSS (extra render pass; the “translucent” family is deferred), displacement maps, TAA.

## 6. Asset pipeline (production)

Today every mascot is **procedural** (`source: { type: 'procedural' }`) – these are *prototype assets*, honest placeholders for a modelled character. The data model already carries `source: { type: 'glb', url, draco, meshopt, ktx2 }`; the loader is intentionally not implemented yet (stage throws a clear error).

Recommended workflow **[background + verified tool docs]**:
1. DCC: Blender (or Houdini for grooms) → author mesh, rig (bones for body; shape keys for face), bake AO/curvature, paint a *groom/density map* and a *fur‑length map* (the shell shader should sample these when present instead of procedural values).
2. Export GLB: apply modifiers, +Y up, bake animations, Principled BSDF only.
3. `gltf-transform validate` → `inspect` → `optimize --prune --dedup --weld`.
4. Budgets (starting points, **[assumption]**): hero body ≤ 30 k tris with a ≤ 8 k LOD1 for mobile; ≤ 2 × 2048² textures (UASTC for normals, ETC1S for colour/ORM via `gltf-transform uastc/etc1s`, loaded with `KTX2Loader`); Meshopt for geometry/morph targets/animation (fastest decode, per glTF‑Transform docs); target ≤ 1.5 MB per mascot over the wire.
5. Variants: material variants/KHR_materials_variants or our own `customization` data for colour slots; accessories as separate node subtrees with a `accessory` tag (already how procedural parts work).
6. Thumbnails/previews: `npm run thumbs` already renders deterministic transparent PNGs through headless Chrome for every definition (used for cards, posters while loading, and fallback when WebGL is unavailable).
7. Lazy loading: viewers mount on intersection; posters appear first; LOD/DPR by quality tier.

## 7. Performance strategy

- Tiers LOW/MEDIUM/HIGH/ULTRA: DPR cap (1/1.5/2/2.5), shell scale, shadow map size (off/1k/2k/2k), MSAA, 30 fps cap on LOW.
- Detection: URL override → device memory/cores/pointer type → renderer string (software GL ⇒ LOW). Start tier is a guess; **adaptive downgrade** after sustained >38 ms frames.
- Render only when visible (IntersectionObserver + Page Visibility); multiple viewers never run at once off‑screen.
- Disposal: `Stage.dispose()` frees geometry, materials, PMREM targets, shadow map, blob texture, observers, listeners and force‑loses the GL context.
- Reduced motion: idle amplitudes ×0.3, no blinks/ear flicks/saccades, no camera drift, instant camera moves, clip weights ×0.45.
- Mobile: touch‑action `pan-y` on page viewers (scroll still works), pinch zoom + drag in the playground, bottom‑sheet controls, portrait camera pull‑back.

## 8. Product definition

> A premium interactive 3D mascot playground and, eventually, a mascot library where people discover, inspect, customise, animate and use high‑quality digital mascots – soft creatures, plush toys, synthetic companions and beyond.

Not an avatar creator, not a GLB viewer, not a SaaS dashboard. The UI is deliberately editorial and quiet (serif display type, paper background, one ink colour, no gradients on chrome); the character is the colour.

## 9. Architecture summary
See `ARCHITECTURE.md`. Short version: React for chrome, an imperative `Stage` for rendering, a data‑only `MascotDefinition`, a generic role‑based animator, and per‑environment lighting data.

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **No real‑GPU measurements yet** | Tier thresholds may be wrong | Adaptive downgrade; first task on real hardware: profile iPhone/Android mid‑tier and Intel iGPU, adjust `TIERS`. |
| Procedural characters are **prototype quality** | “Premium” bar needs a professional modeller/rigger | Pipeline accepts GLB; do not market these as final. |
| Fur overdraw on 3× DPR phones | Thermal throttling | DPR caps, layer scaling, 30 fps cap on LOW. |
| WebGPU becoming the default path | Possible rewrite of fur shader to TSL | Rendering isolated in `engine/`; fur shader is one file. |
| Brand/ethics (cute AI mascots for adults; WIRED critique) | Positioning | Diverse families; avoid child‑coded marketing. |
| Licensing of future assets | Legal | Policy in `ASSETS.md`; licence fields in definitions. |
| Accessibility of a canvas‑centred UI | Exclusion | Keyboard orbit/poke, labelled canvas, all controls are real buttons, poster fallback, reduced motion. |

## 11. Decisions

1. **three.js WebGL2, not WebGPU** – reach and no benefit for a fragment‑bound workload today.
2. **Imperative engine + React chrome, not R3F** – lifecycle control, no re‑render coupling.
3. **Shell fur, procedural, instanced** – best look/cost; no textures; scales by layer count.
4. **IBL baked at runtime from softbox data** – zero HDRI licensing, tiny payload, per‑environment mood.
5. **Role‑based animator with springs** – mascots differ by data, not code; secondary motion and settling come from the spring layer.
6. **Hash routing, static hosting, no backend** – matches “local/static metadata” scope.
7. **Thumbnails generated, committed, and used as posters** – fast first paint, graceful fallback.
8. **No payments/accounts** – out of scope; licence & source fields prepared.
