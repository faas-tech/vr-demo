# Mini-game review · 20 September 2026

Open [the screenshot gallery](index.html). All views use seed 101 in the live
Three.js application. These are application captures, not concept renders.

| Capture | What to inspect |
|---|---|
| [Connect Four: Blue terrace](connect-four-blue-terrace.png) | Giant perforated board, Blue win, player markings, white plinth and game menu. |
| [Connect Four: Yellow terrace](connect-four-yellow-terrace.png) | Same board from the opposite player position; readable rear face and marquee. |
| [Connect Four: arrival cliff](connect-four-cliff.png) | Height above the game field and the descent route. |
| [Checkers: Blue terrace](checkers-blue-terrace.png) | Full board framing, legal-piece rings, player markings and clear board surface. |
| [Checkers: Yellow terrace](checkers-yellow-terrace.png) | Board readability from the opposing terrace. |
| [390 px menu](connect-four-mobile-menu.png) | Compact controls within the viewport. |
| [390 px play view](connect-four-mobile-play.png) | Minimized menu and board fitted to a narrow screen. |

## Verification

- `npm test`: **67 passed**, four test files.
- `npm run build`: passed. Vite reports the existing large-bundle category warning;
  the built JavaScript is approximately 639 kB / 164 kB gzip, including Three.js.
- `git diff --check`: clean.
- Browser: **49 assertions passed**, including 20 world-menu ray targets across
  all four terraces. See [the recorded result](browser-checks.json) and
  [the reusable browser exercise](../../scripts/verify-games.browser.js).
- Real pointer selection on the Connect Four geometry placed one Blue piece in
  the expected center column and handed the turn to Yellow.
- No application console errors observed during final gameplay and captures.
- Game switching released geometry/material/texture resources: eight round trips
  returned to the same rendered geometry and texture counts.

Observed **desktop**, seed-101 rendering counters at 1440 × 900:

| View and position | Draw calls | Submitted triangles | GPU geometries | Textures |
|---|---:|---:|---:|---:|
| Checkers, Yellow play terrace, after two turns | 21 | 159,254 | 22 | 2 |
| Connect Four, Blue play terrace, seven-disc winning position | 22 | 214,026 | 24 | 2 |

Counters depend on frustum, game state and resource warmup. They do not include
an active XR stereo session and are not headset frame-time measurements. The
world-menu ray exercise checks geometry and routing, not hardware controller
comfort. A physical Quest session remains outstanding.
