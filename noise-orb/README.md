# Noise Orb

A separate, browser-only musical instrument. It reuses Particle Studio's `lab` (Noise Orb) sphere definition, shader prelude and noise uniforms. No studio UI or Ghost runtime is loaded. Production output is self-contained; it needs no CDN, samples, server or API keys.

From this directory, run `npm run dev` and open **http://127.0.0.1:5174**. Dependencies resolve from the parent project's existing `node_modules` and npm lockfile; run `npm ci` in the parent only if they are missing. `npm run build` creates `noise-orb/dist`, which any static host can serve. `npm run verify` runs strict TypeScript, lint, unit tests, browser/audio tests and the production build.

Move to stir; click/tap to pluck; press and drag to swell. The first gesture starts audio. The sound button remembers mute. Exit closes the audio context; returning waits for another gesture. Keyboard: focus the orb, use arrows to choose a point, Space/Enter to pluck, and Shift+arrows to swell.

Musical constants live in `src/config.ts`: change `MUSIC.root` to transpose, or `MUSIC.subdivisions` from 2 to 4 to try sixteenths. The default is D major pentatonic at 84 BPM. There are no user settings.

The second instrument, **http://127.0.0.1:5174/shape.html**, adds a composition dock while retaining the original page. Its 24 eighth-note steps loop over three bars. Melody starts with the original six-note phrase; Undertow and Air are empty voices to build underneath and above it. Select a lane, tap the wave to add/remove notes, and drag a note vertically to set pitch. Drag the selected wave line horizontally to shift every note together in eighth-note steps, wrapping around the loop. Keyboard arrows move between steps or change pitch; Enter/Space toggles a note, and Alt+Left/Right shifts the whole lane. Drag the Level, Tone, Length and Lift knobs vertically, or use their native range-input keyboard controls. Each lane can be paused independently.

Edits audition on the beat and save locally under a separate score key. Lane identity, notes and knob values survive reload; malformed saved music is reported and preserved. The wave shapes use the same lane parameters that drive actual voice level, low-pass cutoff, decay and scale transposition. Played notes pulse their dots and create orb ripples at scheduled audio time. The audio graph, pentatonic guardrails and six-voice pool are shared with the original instrument. Browser tests cover the original and composition pages as separate self-contained production entries.

**Randomise** builds a new tune across all three lanes: it varies note placement, melodic motifs, level, tone, length and lift, and enables every generated voice. Melody, Undertow and Air keep their musical roles; the key, tempo and master mute stay fixed. Each click changes every lane's pattern and knobs, saves the result and auditions it on the beat. **Undo** restores the setup from immediately before the latest randomisation during the current visit; reload retains the current saved tune but clears this undo history.

Notes are quantized by the Web Audio clock with 25 ms lookahead polling and a 100 ms horizon. A single pending user note wins over ambient arpeggios; the voice pool caps overlapping plucks at six. Delay, generated reverb, compression and a bounded output stage keep the mix controlled. The renderer uses scheduled audio time for ripples. Muting retains visual interaction.

The original spherical Noise Orb is retained instead of replacing it with a flat grid. Raycasting onto its equatorial ground plane supplies X/depth for both interaction displacement and pitch. Point counts are 12,800 on desktop and 4,500 on mobile; pixel ratio is capped at 2. Reduced motion softens displacement and slows noise. An SVG still and musical interaction remain available without WebGL.

Automated checks cannot establish listening quality on phone speakers or real-device frame rates. Those require listening and hardware measurements before claiming the 60/45 FPS targets.
