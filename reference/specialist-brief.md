# Prompt for the 3D environment specialist

**Current amendment:** Read the first section of `crater-environment.md` before
using this historical brief. The user has since requested upper cliff arrivals,
a much deeper court and lower play terraces connected by descent pads. That
request supersedes the two-ledge-only restriction below. A further request now
adds Connect Four, checkers and game menus on the central field. The current
amendments also supersede historical no-games/no-HUD restrictions and the center
post. See `docs/gameplay-physics-ux.md` and `reference/game-review/`.

Open `reference/crater-environment.md` and the stills gallery first. Copy everything below the line into the specialist model.

---

You are improving a Meta Quest WebXR prototype in this repo. Match the locked stills. Do not invent a new layout or a new color system.

## What to open first

1. Read `reference/crater-environment.md`. That file is the shape and behavior spec.
2. Open the stills gallery: `reference/style-stills/index.html`. Review these eight images in this order. They are one world.

| File | What it shows | Use it for |
|---|---|---|
| `crater-two-ledges-wide.png` | Circular crater, blue ledge left, yellow ledge right, white court in mist | Primary layout. Match this first. |
| `crater-angle-side-profile.png` | Same bowl from the side, both ledges in profile | Confirm both platforms sit in the mountains. |
| `crater-angle-orbit.png` | High orbit, full 360 rim, ledges at opposite points | Rim is a closed ring. |
| `crater-angle-overhead.png` | True top-down | Circular plan. Blue pole, yellow pole, court on the axis. |
| `crater-angle-overhead-tilt.png` | Tilted overhead | Ledges stay small relative to the peaks. |
| `crater-angle-yellow-stand.png` | Standing on the yellow ledge looking at the blue ledge | Player 2 camera. |
| `crater-angle-court-toward-yellow.png` | Court in mist, looking up at yellow | Court isolation and yellow rim from gamefield height. |
| `crater-angle-court-toward-blue.png` | Court in mist, looking up at blue | Same court, opposite rim. |

3. Run the current app: `npm test` then `npm run dev` (port 5299). The live bowl is a first generator. It is too flat and too much like two decks. Replace that generator. Do not treat the live scene as the target.

4. After each visual change, stand the camera on the blue ledge, then the yellow ledge, then look from above, then stand on the court. Compare to the stills above. Same seed must rebuild the same world.

## Tech stack (keep it)

- Vite, TypeScript, Three.js, WebXR Device API (`immersive-vr`)
- Seeded generation: `src/createSeededRandom.ts` and `src/generateCanyonBowl.ts`
- Scene build: `src/buildCanyonScene.ts` (instanced wireframe cubes)
- Colors: `src/sideColors.ts`
- Entry: `src/main.ts` (seed field, Rebuild same seed, New seed, OrbitControls, XR button)
- Tests: `src/generateCanyonBowl.test.ts` and `src/createSeededRandom.test.ts`

Keep Vite + Three.js + WebXR. Keep a seed. Keep unit tests for: same seed same blocks, different seed different terrain, blue home vs yellow away, white court lower than the ledges, some red between the sides. Update tests if the shape changes, but do not drop seed consistency.

## Colors (only these four)

| Name in code | Role |
|---|---|
| Blue | Player 1. Home ledge and the mountain that wraps behind it. |
| Yellow | Player 2. Opposite ledge and the mountain that wraps behind it. |
| Red | Accent on the inner slopes between the two sides. Sparse. |
| White | Court and highlights. The court is shared ground. |

No cyan, magenta, lime, pink, or extra palette.

## Space to build

A circular crater. The rim is closed on all sides. Tall, irregular stacked cubes. Height varies a lot. Peaks behind each player.

Two small ledges only, opposite each other on the diameter. Each ledge is a terrace cut into the mountainside. Mountains close behind each ledge. The ledge is small compared with the cliffs. Players face each other across the pit.

The white court is a tidy rectangle on a low island in the center. Thick mist sits in the pit and separates the court from the slopes. The court is the only neat geometry. Terrain everywhere else is generated block stacks. Geographic variety from the seed.

Gameplay that this space must support later (build the markers, not the games):

- Start on your ledge.
- Some games stay on the rims and use the bowl as the volume between players.
- Some games let a player drop through the mist onto the court.
- A new seed builds a new crater with the same rules (two opposite ledges, closed bowl, center court).

Name the stand points and the court in the generated data so later game code can find them (`playerOneStandX/Y/Z`, `playerTwoStandX/Y/Z`, `court`).

## How to render it

- Dark void background. Neon wireframe cubes (instanced meshes per color). Quest has a low draw-call budget; do not spawn thousands of separate Mesh objects.
- Fog or a mist volume in the pit only, strong enough that the court reads as an island.
- Desktop: camera starts on the blue ledge, looking at the court and the yellow ledge. Orbit is fine for review.
- WebXR: keep `renderer.xr` and the enter-VR button. HTTPS for Quest can wait unless you already have it.

## Done when

- Seed 101 (or whatever default you pick) looks like `crater-two-ledges-wide.png` in plan and elevation: circular bowl, two tucked ledges, mist, white court.
- From the blue ledge you can see the yellow ledge. From the yellow ledge you can see the blue ledge.
- Rebuild same seed is identical. New seed is a different crater with the same structure.
- `npm test` passes.
- You did not add art assets, characters, or a second color system.
