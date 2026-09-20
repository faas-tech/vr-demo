# Circular crater: shape and behavior

## Current game amendment — 20 September 2026

The user has now requested giant Connect Four and checkers mini-games. This
supersedes the historical no-games, no-text/HUD and court-post restrictions below.
Both games use the same center field, red/white board architecture and blue/yellow
pieces. The center post has been removed. Game plinths extend beyond the original
8 × 5 m island; the ring and player terrace coordinates remain the same.
Players descend to lower terraces before playing. Desktop and in-headset menus
select games and manage a shared local two-player session. The current game
captures are in `reference/game-review/`; rules, physics and UX research are in
`docs/gameplay-physics-ux.md`. Original stills remain the material/mood reference.

## Current vertical layout — 20 September 2026

The user subsequently requested much greater height and scale, with high cliff
arrival positions and a jump-down pad to lower playing positions. This update
supersedes the exact two-ledge count and elevations in the original lock below.
The circular plan, two opposite player sides, four colors, cube materials and
isolated central court remain authoritative.

- Crater diameter: approximately 60 m; tall irregular peaks behind each side.
- Upper arrival terraces: surface Y = 23 m, centered at Z = ±23 m.
- Lower play terraces: surface Y = -2 m, centered at Z = ±14 m.
- Court: Y = -9 m, centered on the same axis, 8 × 5 m.
- Arrival is 32 m above the court. A descent pad moves the player down 25 m
  to the play terrace, which remains 7 m above the court.
- The same pad provides a return route. Desktop uses the travel button; VR
  uses controller aim and trigger. A brief fade masks the relocation.
- Start anchors sit 0.8 m toward the lip of the upper terrace for court visibility.
- New cameras `bluePlay` and `yellowPlay` inspect the lower positions.

Current browser captures are in `reference/live-review/index.html`. The eight
original stills below remain unmodified as the material and mood reference.

## Original locked art direction

This was the locked environment for the father-and-daughter Meta Quest WebXR demo. Use it for further stills and for the Three.js generator. The eight images in `reference/style-stills/` are one world, eight cameras.

The live app on port 5299 is an earlier generator. It is flatter than these stills. Match the stills.

## What the space is

A circular crater, closed on all sides. Two small player ledges sit on opposite points of the diameter. Each ledge is a terrace cut into its mountain. Tall, irregular cube stacks wrap behind both players so neither stand has a back exit. The players face each other across the pit.

A white rectangular court sits on a low island in the exact center. Thick mist fills the pit and isolates the court from the inner slopes. The court is the only tidy geometry. Everything else is generated stacked cubes.

Four colors only:

| Color | Hex | Role |
|---|---|---|
| Blue | `#1e6cff` | Player 1 ledge and the mountain that wraps behind it |
| Yellow | `#ffe14a` | Player 2 ledge and the mountain that wraps behind it |
| Red | `#ff2a2a` | Sparse accent on the inner slopes between the two sides |
| White | `#ffffff` | Court outline, court post, and a few highlights |

No cyan, magenta, lime, pink, or extra palette. No people, text, HUD, or painted surfaces.

## How it is shaped

Read the stills in this order. Each one locks a different fact.

| Order | File | What it locks |
|---|---|---|
| 1 | `crater-two-ledges-wide.png` | Primary layout. Blue terrace left, yellow terrace right, white court in mist, closed peaks behind both. |
| 2 | `crater-angle-side-profile.png` | Both ledges in profile, each cut into its mountain, court floating in the pit. |
| 3 | `crater-angle-orbit.png` | High orbit. The rim is a full ring. |
| 4 | `crater-angle-overhead.png` | Plan view. Blue mountain and ledge at one pole, yellow at the other, court on the axis. |
| 5 | `crater-angle-overhead-tilt.png` | Same plan with height readable. Ledges stay small relative to the peaks. |
| 6 | `crater-angle-yellow-stand.png` | Player 2 eye height. Blue ledge visible across the pit. |
| 7 | `crater-angle-court-toward-yellow.png` | Court-level, looking at the yellow mountain. White court and post in the foreground. |
| 8 | `crater-angle-court-toward-blue.png` | Court-level, looking at the blue mountain. Same court, opposite rim. |

Build these volumes:

1. **Rim.** A closed ring of irregular cube stacks. Height varies a lot. Peaks sit behind each player. The plan is circular, or close enough that an overhead shot reads as a crater.
2. **Blue stand.** A small rectangular terrace on the blue mountain, roughly opposite the yellow stand. Cliffs close behind it. The terrace is large enough for one standing player and small compared with the cliffs.
3. **Yellow stand.** The same idea on the opposite mountain. Same size class as the blue terrace. The two terraces face each other.
4. **Pit.** Empty volume between the inner slopes. Mist occupies this volume so the court reads as an island.
5. **Court.** A neat white rectangle with a short center post. Centered on the crater axis. Lower than both stands. Size is a fraction of the crater diameter, about the scale of one ledge.
6. **Inner slopes.** Red cubes appear here, mixed into blue and yellow stacks. Keep red sparse. Do not paint a solid red bowl.

A hallway of two facing walls fails the overhead and orbit shots. Extra ledges, a third team color, or a court that touches the slopes also fail the set.

## How it behaves

Players start on their own ledge, standing, looking across at the other ledge and down at the court.

Two later game families use this one space:

- **Rim games.** Players stay on the ledges and use the pit as the volume between them. The court is visible and unused.
- **Court games.** A player drops from a ledge through the mist onto the white island.

The generator must name the places later game code will use:

- `playerOneStandX`, `playerOneStandY`, `playerOneStandZ`
- `playerTwoStandX`, `playerTwoStandY`, `playerTwoStandZ`
- `court` with `centerX`, `centerY`, `centerZ`, `widthInBlocks`, `depthInBlocks`

A seed number builds the crater. The same seed rebuilds the same block list. A new seed builds a different crater that still has two opposite tucked ledges, a closed rim, and a center court. Variety lives in stack heights, peak shapes, and where red cubes land. The rules stay fixed.

Render as neon wireframe cubes on a black void. Use instanced meshes per color. Meta Quest has a low draw-call budget, so do not spawn thousands of separate mesh objects. Put fog or a mist volume in the pit so the court stays isolated. Desktop camera starts on the blue stand, looking at the court and the yellow stand. WebXR stays on `immersive-vr`.

## Prompt for more stills

Paste this when generating another camera on the same world. Attach two or more images from this folder as references.

```
Same circular neon-cube crater as the attached references. Closed 360-degree rim of irregular stacked wireframe cubes. Small blue rectangular terrace tucked into the blue mountain, cliffs wrapping behind it. Small yellow rectangular terrace tucked into the opposite yellow mountain, cliffs wrapping behind it. The two ledges face each other across the diameter. White rectangular court with a short center post on a low island in the exact center, wrapped in thick dark mist that separates it from the inner slopes. Sparse red cubes on the inner slopes only. Four colors only: electric blue #1e6cff, neon yellow #ffe14a, neon red #ff2a2a, white #ffffff. Black void background. No people, no text, no HUD, no extra colors. Match the attached stills exactly.

Camera: [describe the new angle here]. 16:9.
```

Useful extra cameras if needed later: blue-stand eye height looking at yellow, a lower orbit that still shows the full ring, a close crop of one tucked terrace with the mountain closing behind it.

## Prompt for the 3D generator

Copy this block into a modelling model along with the stills gallery.

```
Open reference/style-stills/index.html and reference/crater-environment.md.
Match those eight stills. Replace src/generateCanyonBowl.ts. Keep Vite, TypeScript,
Three.js, WebXR, createSeededRandom, sideColors, instanced wireframe cubes, and
seed tests.

Build a circular crater with two opposite tucked ledges (blue Player 1, yellow
Player 2), a closed irregular rim, sparse red inner-slope accents, and a white
court island in pit mist. Name playerOneStandX/Y/Z, playerTwoStandX/Y/Z, and court
in the generated data. Same seed must rebuild the same blocks. A new seed must
build a different crater with the same rules.

Done when seed 101 looks like crater-two-ledges-wide.png in plan and elevation,
each stand can see the other stand, npm test passes, and you have not added art
assets or a fifth color.
```

## Done when a new still or a new generator matches

- Overhead reads as a circle with blue at one pole and yellow at the other.
- Both ledges are small terraces with mountains closing behind them.
- The court is a tidy white island in mist, lower than both stands.
- From either stand you can see the other stand.
- A new seed changes the peaks and still keeps this layout.
