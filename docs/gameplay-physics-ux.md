# Crater games: gameplay physics and player experience

**Design and research review · 20 September 2026**  
**Audience:** the Crater team planning its first playable VR mini-games.

The arena now has two playable games: a giant upright Connect Four board and a horizontal checkers board. Both occupy the existing central field, use red and white architecture, and give Blue and Yellow their own pieces. Players begin above the crater and activate a pad to descend to their playing terrace. The scale comes from the world and the pieces; the player's camera stays under head tracking during play.

This build supports two people sharing one browser or headset. It has explicit turn handoff, separate positions for each game, and no network service or computer opponent. Refreshing the page resets both games. Desktop browser checks have passed; physical headset comfort, target acquisition and frame timing still require testing.

## What the research supports

The original game instructions establish the disc-dropping, four-in-a-row objective. The classic product has 42 discs; Hasbro's electronic manual explicitly illustrates horizontal, vertical and diagonal victories. The implementation uses the familiar seven-column, six-row layout. Blue starts in this version, and the requested blue/yellow palette replaces the physical product's colors. [Hasbro classic game](https://instructions.hasbro.com/en-gb/instruction/the-classic-game-of-connect-4), [Hasbro Connect Four instructions, page 2](https://www.hasbro.com/common/documents/dad2614d1c4311ddbd0b0800200c9a66/A56241E019B9F36910E1FA0D6031217B.pdf).

For checkers, this build uses English draughts: twelve pieces per side; forward diagonal moves and captures for men; short forward/backward moves and captures for kings. Captures are compulsory, a started chain must finish, and crowning ends that turn. Players may choose between capture paths without choosing the longest. A side with no legal move loses. The automatic repetition and no-progress draws here adapt WCDF's referee-based adjudication; they are not a tournament implementation. [WCDF rules, sections 1.15–1.21 and 1.30–1.32](https://wcdf.net/rules/rules_of_checkers_english.pdf).

Meta recommends distance interaction, teleportation options, and avoiding abrupt artificial camera motion. Its locomotion guide also recommends temporal occlusion for rapid travel and consistent frame delivery. These support the choice of a user-triggered fade between terraces. They do **not** establish that a particular user will find this crater comfortable. [Meta comfort guidance](https://developers.meta.com/horizon/design/comfort/), [Meta locomotion best practices](https://developers.meta.com/horizon/design/locomotion-best-practices/).

W3C's XR accessibility requirements call for interactions that do not depend on particular body movements, sufficiently large targets, and ways to mute nonessential motion. They are design requirements, not a certification of this application. This build applies them through ray selection, desktop button alternatives, explicit player labels, shape markings, and a reduced-motion setting. [W3C XAUR, sections 4.2–4.4](https://www.w3.org/TR/xaur/).

## Arrival, descent and turn handoff

1. Choose a game on the desktop card or the world-anchored headset menu. Switching games preserves each position for the current page session.
2. Blue begins on the high cliff, 32 meters above the court. The pad or **Descend to play** control transfers the player down 25 meters. No physical jump is required.
3. On the lower terrace, legal input becomes available. The game accepts a move only for the side whose turn it is, at the play level, outside a travel or piece animation.
4. After a move lands, **Pass to Yellow/Blue** transfers control. Each side's first visit starts at its cliff and requires a descent; later handoffs return to that side's play terrace.
5. A finished match locks its board. Restart requires a second selection within five seconds. Changing games cancels that pending restart.

The fade takes 360 ms, with relocation while the view is dark. These timings are implementation choices awaiting headset evaluation. The menu stays anchored in the world beside the terrace. The game title and turn/result appear on the arena itself, so the core status does not depend on a browser overlay.

Desktop review cameras remain available for development and can place the viewer directly on a play terrace. They are review tools, not authentication or a multiplayer permission boundary.

## Connect Four: impact without uncertain landings

| Element | Implemented behavior | Reason for the choice |
|---|---|---|
| Monument | Perforated red slab, white rings on both faces, red supports and a 10.8 m plinth | Both opposing players can read the same physical board. |
| Targeting | Select anywhere within a column's large vertical target | Players need not reach a ten-meter structure or aim at a tiny top opening. |
| Preview | A translucent team disc shows the lowest empty slot before selection | The outcome of the input is visible before committing. |
| Release | One click or primary controller select | A press produces one rules-validated move. |
| Fall | Analytic downward acceleration, followed by a small settling motion | Weight and scale remain visible while the final cell stays exact. |
| Completion | Four-in-a-row rings, named winner, locked board; full-board draw | Results remain visible until players choose a restart. |

The disc animation uses

`y(t) = max(targetY, startY − ½ × 9.81 × t²)`

and `fallTime = √(2 × dropHeight / 9.81)`. This is the constant-acceleration model for a body released from rest, ignoring air resistance. OpenStax describes this model and uses an approximate terrestrial acceleration of 9.8 m/s². The build chooses 9.81. An 8.2 m empty-column drop therefore takes about 1.29 seconds, plus 0.16 seconds of visual settling. The settling coefficient is 0.045 m; it is an authored effect, not a collision simulation. [OpenStax, University Physics Volume 1, §3.5](https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall).

Rules choose the destination before animation begins. The moving disc does not collide with the decorative frame, jostle settled pieces, or decide the winner through physics. This is a deliberate tradeoff: reliable board play has priority over free throwing. The next move stays locked until the animation finishes. Reduced motion places the piece at its destination with an 80 ms input lock.

**Hypothesis to test:** the large column targets and landing preview should reduce wrong-column moves compared with aiming at the top slot. Measure accidental placements and first-turn completion time; do not assume the giant scale alone makes targeting easy.

## Checkers: readable tactics across a deep pit

The playing grid spans 9.6 × 9.6 meters, on a red foundation with a white perimeter. Pieces occupy the red squares. The lower terraces put players approximately eight meters above the board surface at a 1.6 m eye height. Desktop play cameras frame the board automatically; headset users look down naturally from their terrace.

Selection has two stages. First select a highlighted movable piece; then choose a highlighted destination. Before committing, another legal piece can be selected. During a capture chain, only the continuing piece is available. This avoids requiring players to hold a controller trigger while dragging a distant object. Invalid input leaves the board unchanged and displays guidance.

Ordinary moves take 0.42 seconds and lift 0.18 m. Captures take 0.62 seconds and lift 0.8 m. Both use cubic easing for horizontal position and a sine arc for height, then land on the exact square center. Those values are authored presentation, not measured real-world checkers physics. Captured pieces disappear when the move is accepted. Promotion doubles the visual stack height approximately and adds a white ring. Blue pieces carry a white square inlay; Yellow pieces carry a white bar. These markings supplement color identity in both games.

The casual rules automatically declare a draw on the third completed matching position with the same side to move, or after 80 consecutive individual turns consisting only of noncapturing king moves. A capture or man move resets the latter counter. Selection is reversible before commitment; tournament touch-move penalties, clocks, referee claims and draw offers are outside this build.

**Hypothesis to test:** near-row pieces and the elevated board view should leave far-row destinations readable without leaning. Test this from both terraces, seated and standing, including kings and forced multi-jump positions. If far rows become difficult, adjust the terrace-to-board relationship or offer an optional larger command view before increasing piece size enough to hide neighboring squares.

## Input, feedback and simulation architecture

WebXR's `select` event reports a completed primary action from an input source. The controller ray, desktop board click and labeled button controls all converge on the same rule functions. The headset menu uses the same ray and select action as the game. There is no required two-handed gesture. [MDN WebXR select event](https://developer.mozilla.org/en-US/docs/Web/API/XRSession/select_event).

The game state is discrete: cells, side to move, result and, for checkers, the required continuation piece. Rendering samples motion using elapsed time rather than adding velocity once per rendered frame. A delayed frame can skip part of an animation, but cannot put a piece in a different cell. Optional controller haptics pulse after landing when the device supports them; failure of that API does not affect the move. Audio feedback is not implemented.

There is no rigid-body dependency in these board games. If a later throwing game needs one, use a fixed simulation step with interpolated rendering and separate authority for legal game events. Box2D's documentation recommends fixed stepping and discusses substeps; that guidance concerns its solver and is not a mandate to use Box2D or a particular step count for this Three.js project. [Box2D simulation documentation](https://box2d.org/documentation/md_simulation.html).

For future connected headsets, send move intentions such as `drop(column)` or `move(from, to)` to a session authority. Validate player identity, turn, session revision and legal move there; broadcast the accepted state and animation start time. Clients should reconstruct presentation from that accepted event. Local validation in the current build is useful structure for this work, but it is not a network trust boundary.

## Validation and next acceptance checks

Automated rules and environment tests cover all Connect Four win directions, draws, full columns, invalid turns, checker captures, branches, chains, kings, promotion stops, blocked-side victories, repetition, no-progress draws, terrace gating and motion endpoints. A browser exercise plays a complete Connect Four win and a checkers exchange through the menu controls, checks input locking and restart confirmation, preserves games across switching and seed rebuilds, and checks resource counts after repeated switches. A real pointer click on the 3D Connect Four board also produced the expected move.

The verification record and screenshots are in [the game review folder](../reference/game-review/README.md). Desktop rendering counters are useful regression evidence, not a Quest frame-rate measurement.

Before treating this as headset-ready, run these acceptance checks on the target Quest model:

- Complete each game from both sides with controller rays. Verify first-time descent, handoff, restart and switching entirely inside VR.
- Test seated and standing users, different eye heights, both hands and reduced motion. Check that menu text and far-row highlights are readable without leaning or repeated large neck turns.
- Profile CPU/GPU frame times for the selected refresh rate, both eyes, fog visible, pieces moving and menu open. Record missed frames and thermal behavior during a sustained session; draw-call count alone is insufficient.
- Compare column acquisition errors and checkers destination errors in a small formative usability study. Record discomfort and allow users to stop; do not convert this small test into a universal comfort claim.
- Verify headset removal/resume, controller disconnection and session exit during travel or animation. Desktop review cannot establish their hardware behavior.

Research used official game rules, platform documentation, W3C user requirements and a physics textbook. No headset study or player interviews were conducted for this change. Source details and scope limits are recorded in [the evidence ledger](gameplay-evidence.md).
