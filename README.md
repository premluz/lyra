# Particle Studio

A standalone internal workbench for creating WebGL particle experiences. React, strict TypeScript, Vite, Radix UI, Lucide, Three.js, and GSAP. npm is the only package manager.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The dev command first bundles the independent website runtime.

Select a director keyframe, pick its rest shape and motion shader, and adjust appearance, transforms, interaction, and drift in the inspector. Scrub the timeline or play the sequence. Add keyframes at the playhead; existing frames are spaced to keep the sequence valid. The first and last frames anchor 0% and 100%. Intermediate frame positions and transition easing are editable.

**Scroll preview** simulates a website scroll inside the viewport. The sun/moon button switches the preview background and blending. Capture exports a transparent PNG. Projects save to local browser storage; save JSON for portable backups. Open loads a validated JSON project. Undo/redo and Space playback shortcuts are available.

**Export experience** downloads a ZIP containing `particle-runtime.js`, `experience.json`, required model assets, and a scroll demo. Serve the extracted folder over HTTP; the export works without Ghost, React, a CDN, or an internet connection.

```js
import { mountParticles } from './particle-runtime.js';

const response = await fetch('./experience.json');
if (!response.ok) throw new Error('Project failed to load');
const experience = await mountParticles(
  document.querySelector('#particles'),
  await response.json(),
  { mode: 'scroll', modelBase: './models' }
);
```

Size the host in your stylesheet. Use `scrollElement` to bind a particular section, `mode: 'time'` for timed playback, or `mode: 'manual'` with `experience.seek(progress)` for another scroll driver. The API exposes `pause()`, `play()`, `setLight(boolean)`, and `destroy()`. Call `destroy()` when removing the experience.

The studio and export share one deterministic director and renderer. Shape buffers remain on the GPU while morph progress, transforms, and shader uniforms interpolate. Seeded procedural geometry makes random seeks and exports reproducible. Reduced-motion preferences freeze shader time and disable automatic timed playback; manual and scroll seeking remain available.

## Extraction

Source: `ghostthemeportfolio/ghost2/content/themes/thinkingisfree`. The 15 procedural states, 11 style definitions, GLSL composition order, original defaults, and 9 GLB assets are preserved. Geometry generators were split into small typed modules; their outputs are checked against original-source hashes at 1,000 and 1,733 particles. All meshes in a GLB are surface-sampled together. Ghost page triggers, preloader, global variables, and layout offsets are replaced by the standalone editor/runtime.

`scripts/extract.mjs SOURCE FRESH_OUTPUT_DIRECTORY` records a fresh reference extraction without overwriting an existing folder. The checked-in engine includes the subsequent type annotations, seeded randomness, and function splits. `scripts/reference.mjs SOURCE` records original geometry hashes and refuses to overwrite the fixture.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:visual
```

Browser checks cover every built-in shape and motion shader, editor changes and persistence, scroll preview, recovery, and a downloaded ZIP on an independent origin. Visual checks compare element-scoped dark/light viewport PNGs. Intentional viewport changes require `npx playwright test tests/visual.spec.ts --update-snapshots=all`; the expected baseline count is two.

The tool targets desktop screens of at least 1,000px width. Projects are local, with JSON backups; collaboration and arbitrary GLSL authoring are not included. The runtime bundles the GLTF loader and GSAP, so the independent export is approximately 210 KB gzipped before model assets. Deployment must provide HTTP hosting.
