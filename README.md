# VR Demo

A Meta Quest Browser WebXR prototype. Two players stand on opposite canyon
cliffs. Games will sit in the ravine between them.

## Visual direction

Dark mode first. Neon grid geometry only. No painted surfaces or art assets
yet.

The current target is a hybrid of three studies:

- Continuous cyan floor grid on the near cliff
- A real drop between the cliffs, with a simple court in the ravine
- Cyan near platform, magenta far platform

Style stills live in `reference/style-stills/`. Those images are the look we
will match in Three.js.

| File | Camera |
|---|---|
| `canyon-hybrid-near-cliff.png` | Standing on the cyan cliff, looking across |
| `canyon-hybrid-wide-view.png` | Both cliffs and the ravine court |
| `canyon-hybrid-looking-down.png` | Looking down from the cyan edge |
| `canyon-hybrid-far-platform.png` | Standing on the magenta cliff, looking back |

## Planned stack

Vite, TypeScript, Three.js, and the WebXR Device API (`immersive-vr`). Light
mode will be a later theme swap, not a second app.

The renderer is not installed yet. We are locking the standing view first.
