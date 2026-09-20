# Crater VR

A seeded neon crater with giant **Connect Four** and **checkers**, built with
Vite, TypeScript, Three.js and WebXR. Blue and Yellow command red-and-white
boards from opposite terraces above a field surrounded by mist.

## Run and play

```sh
npm install
npm run dev
npm test
npm run build
```

Open <http://localhost:5299/>. Seed `101` is the default.

1. Choose **Connect Four** or **Checkers** in the game menu.
2. Activate **Descend to play**, moving from the high cliff to your lower terrace.
3. Click the giant board: a column for Connect Four; a piece then destination for
   checkers. **Button controls** offers labeled, keyboard-accessible alternatives.
4. Use **Pass to Yellow/Blue** after each turn. Each player's first visit starts
   at their cliff; descend to begin. Later handoffs return to their play terrace.
5. Restart uses a second confirming click. Switching games preserves both
   positions until the page is refreshed.

This is a **shared local two-player session** on one browser or headset.
Separate networked headsets, AI opponents and saved sessions are not implemented.

Connect Four detects horizontal, vertical and diagonal wins and full-board draws.
Checkers uses English rules: mandatory captures, full jump chains, short kings,
promotion ending the turn, and blocked-player victories. Automatic threefold
repetition and 80 quiet king-turn draws are casual adaptations. Blue starts.

Blue pieces have a white square mark; Yellow pieces have a white bar. Kings have
a taller stack and white ring. **Reduced motion** removes piece travel and pauses
mist. The OS reduced-motion preference sets the initial option. The minus button
minimizes the game menu; **H** hides/shows the review controls.

In a compatible headset, select **Enter VR**. Aim with a controller and use its
primary trigger/select action. A world-anchored menu beside the terrace provides
game selection, travel/handoff, restart and reduced motion. The luminous square
pad also descends/returns. Tracked physical height supplies eye height. Travel
uses a brief fade; players do not need to physically jump. Optional landing
haptics are used when supported.

Quest access requires HTTPS or a browser-recognized secure local development
origin. Plain LAN HTTP is not a headset deployment. A physical headset session
is still required to validate stereo appearance, comfort and frame timing.

## World and review tools

| Place | Surface elevation | Height above court |
| --- | ---: | ---: |
| Cliff arrival terrace | 23 m | 32 m |
| Lower play terrace | -2 m | 7 m |
| Court origin | -9 m | 0 m |

The world is about 60 m across, with a closed rim and irregular peaks. Arrival
terraces and lower play terraces sit at opposite poles. A pad connects each
pair with a 25 m descent. The original 8 × 5 m court island remains under the
central game structures; their plinths extend it to support the larger boards.

- Drag to orbit; scroll to move closer. Review cameras reset the view.
- Keys **1–4**: Blue cliff, Yellow cliff, wide, overhead.
- Keys **5–6**: Blue/Yellow lower terraces; **7–8**: court toward either side.
- **Pause mist** freezes atmosphere. Seed rebuilds preserve the active games.
- `?view=bluePlay` and other names in `src/reviewCameras.ts` select a review view.
  `&clean` hides overlays. Lower desktop views frame the selected game.
- `window.placeReviewCamera(name)`, `window.getCanyonDiagnostics()` and
  `window.getGameSnapshot()` support repeatable review and read-only diagnostics.

## Implementation

Terrain retains its four-color instancing, seeded random generation and WebXR
setup. Seed 101 has **54,386 solid cubes and 12,159 exposed cubes**. Only exposed
cubes are submitted. The base environment has 15 renderable batches; game boards,
text panels, pieces and controller pointers add their own batches. Counts depend
on view, game state and stereo rendering; see the current review record below.

Game geometry is procedural. Canvas textures provide the arena and headset-menu
text; no imported artwork or external game assets are required. Board holes are
real geometry. Pieces, rings, tiles and team marks use instanced meshes. Fog
clears the selected board footprint, and switching/rebuilding disposes old GPU
resources.

`src/games/gameRules.ts` owns the discrete, immutable move logic.
`pieceMotion.ts` owns frame-independent presentation trajectories. `GameArena.ts`
builds boards and applies validated moves; `GamePanel.ts` and `GameMenu.ts` provide
desktop and in-headset controls. The local turn/terrace gates are not a security
boundary for a future multiplayer server.

## Research and verification

- [Gameplay physics and UX research](docs/gameplay-physics-ux.md)
- [Inspected sources and limitations](docs/gameplay-evidence.md)
- [Game screenshots and verification record](reference/game-review/README.md)
- [Original eight-still direction](reference/style-stills/index.html)
- [Shape specification and later amendments](reference/crater-environment.md)
- [Environment-only captures from before the games](reference/live-review/index.html)

**67 tests** cover world geometry, lifecycle, game rules, travel gating and motion.
The browser flow in `scripts/verify-games.browser.js` verifies descent, a complete
Connect Four win, checkers turns, switching, restart protection and resource
cleanup. It can be evaluated in the running page with `agent-browser eval --stdin`.
The script is a development exercise and intentionally changes the local game
positions. No test result here represents measured Quest performance.
