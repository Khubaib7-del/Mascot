# Mascot quality checklist

Run after every major visual change. Tooling: `node scripts/shots.mjs '<jobs>'` (deterministic stills), `node scripts/pose-sheet.mjs`, `node scripts/verify-ui.mjs` (full headless pass). All of this runs on software GL; judge **shape, face, materials and composition** there, and **performance** only on real hardware.

## Character
- [ ] Compare against `docs/brand/reference/*.webp` at the same pose and crop: head-to-body ratio, limb thickness, ear shape, paw size.
- [ ] Fur close-up in a *bright* preset (soft, studio, snowy): the coat must show fibre, tuft valleys and form shading, not flat white.
- [ ] Full body, close-up, face, eyes (highlight present, pupil readable), mouth, paws, ears.
- [ ] No clipping: scarf vs. head, headphones vs. ears, backpack vs. body, props vs. hands.
- [ ] Face mask: fur fades before the eyes/muzzle; blush is not buried in fur.
- [ ] Four characters look like four designs at thumbnail size (silhouette test).

## Materials
- [ ] Short fur · long fur · wool · fleece · velvet · matte · rubber · glossy · metallic · translucent each read differently.
- [ ] Markings (spots, rosettes, patches) follow the surface and recolour.
- [ ] No plastic look on fur surfaces in warm *and* cold light.

## Accessories & props
- [ ] Scarf, bow, glasses, headphones, cap, backpack, badge, watch attach and recolour.
- [ ] Six charms hang, swing when the character moves, and do not collide.
- [ ] Hand props sit in the hand; table props sit on the table; nothing floats without intent.

## Animation
- [ ] Idle (breath, blink, gaze, ear flick) · walking · running · hopping · flying · thinking · working · celebrating · sleeping.
- [ ] Expression changes ease; no snapping. Reduced motion calms everything.

## Worlds & lighting
- [ ] Each of the 10 worlds × a light and a dark lighting preset.
- [ ] Contact shadow present; character reads against every backdrop.

## Quality lifecycle (must never blank)
- [ ] Switch Auto/Low/Medium/High/Ultra repeatedly during animation.
- [ ] Force a GL error during a tier change → previous scene restored, lower tier attempted.
- [ ] Lose and restore the WebGL context → scene returns.
- [ ] Disable WebGL entirely → poster and message, controls still usable.

## UI
- [ ] Playground: character is the visual priority; panel is dense but scannable; one-line sliders.
- [ ] Keyboard: tab order, focus rings, orbit/zoom/poke with the keyboard.
- [ ] Mobile: controls become a bottom sheet, character stays visible.
- [ ] Contrast of text over every world (landing panels).

## Last pass
See the section appended by the final QA run below.

### Pass 1 (headless Chrome, SwiftShader software GL, `quality=low` unless noted) — `npm run qa`
15/15 automated checks passed: landing hero and all four scroll chapters keep a character on screen; splash dismisses; playground renders; world switch; quality High and Ultra applied in place; **forced GL error during a tier change → fallback ladder (ultra → medium) with the character still on screen**; **WebGL context loss + restore recovers the scene**; unknown route shows 404; mobile (390×844) and reduced-motion playgrounds render.

Found and fixed during the pass: playground camera too tight in landscape; status halo beads read as stray dots (now a ring); Lumi's coat read tan under warm light (default lighting → soft, denser markings); Orbit's planet rendered black at night (emissive map); pupil/highlight spheres built at unit scale; stale-handle GL warnings when tearing down after a context restore.

Not verified (no GPU here): real frame rates, thermal behaviour, real-device DPR; hover/gaze feel; touch gestures beyond layout; screen-reader pass; the thumbnails were rendered at `high`, not `ultra`.
Known visual limits: warm sunset light tints white fur orange (intended, but strong); fur looks speckled at the LOW tier; sea, wet streets and light shafts are shader approximations.
