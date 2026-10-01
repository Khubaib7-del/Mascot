# Mascot quality checklist

Run after every major visual change. Tooling: `node scripts/shots.mjs '<jobs>'` (deterministic stills), `node scripts/pose-sheet.mjs`, `node scripts/verify-ui.mjs` (full headless pass). All of this runs on software GL; judge **shape, face, materials and composition** there, and **performance** only on real hardware.

## Character
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
