# VR Demo

A Meta Quest Browser WebXR prototype. Two players stand on opposite ledges of
a circular crater. Games sit in the pit between them, or stay on the rims.

## Visual direction

Dark mode first. Neon grid geometry only. No painted surfaces or art assets
yet.

Four colors only:

| Color | Role |
|---|---|
| Blue | Player 1 home ledge and mountain |
| Yellow | Player 2 opposite ledge and mountain |
| Red | Sparse accent on the inner slopes |
| White | Court island and highlights |

Each player stands on a small terrace cut into their mountain. Cliffs close
behind both stands. Fog sits in the pit around a white court. Some games stay
on the rims. Some drop through the mist onto the court. A seed rebuilds the
same crater; a new seed builds another crater with the same rules.

Locked stills and the shape/behavior spec:

- Gallery: `reference/style-stills/index.html`
- Spec: `reference/crater-environment.md`
- Specialist prompt: `reference/specialist-brief.md`

## Run

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5299/. Seed `101` is the first bowl. **Rebuild same seed**
should look identical. **New seed** builds another bowl with the same rules.

Vite, TypeScript, Three.js, and WebXR (`immersive-vr`) are in place. Enter VR
from a headset browser. Desktop Chrome will say XR is not supported. Drag to
look around.
