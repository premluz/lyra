import demoCss from '../styles/export-demo.css?raw';
export const DEMO_CSS = demoCss;
export function demoHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Particle experience</title><link rel="stylesheet" href="demo.css"></head>
<body><header>PARTICLE STUDIO / EXPORTED EXPERIENCE</header><button id="theme">Toggle background</button><div class="particle-host" id="particles"></div>
<main><section><h1>One field.<br>A whole story.</h1><p>Scroll to play this particle experience. All rendering dependencies are bundled locally.</p></section><section><h2>Made to move.</h2></section><section><h2>Your next chapter.</h2></section></main><p id="error" role="alert"></p>
<script type="module" src="demo.js"></script></body></html>`;
}
export const DEMO_JS = `import { mountParticles } from './particle-runtime.js';
const error = document.getElementById('error');
try {
  const response = await fetch('./experience.json');
  if (!response.ok) throw new Error('Project could not be loaded: ' + response.status);
  const project = await response.json();
  const experience = await mountParticles(document.getElementById('particles'), project, { mode: 'scroll', modelBase: './models' });
  document.getElementById('theme').addEventListener('click', () => {
    const light = document.body.classList.toggle('light'); experience.setLight(light);
  });
  window.addEventListener('pagehide', () => experience.destroy(), { once: true });
} catch (failure) { error.textContent = 'Particle experience failed: ' + String(failure); console.error(failure); }
`;
export const EMBED_SNIPPET = `import { mountParticles } from './particle-runtime.js';

const response = await fetch('./experience.json');
if (!response.ok) throw new Error('Could not load experience');
const project = await response.json();

const experience = await mountParticles(
  document.querySelector('#particles'),
  project,
  { mode: 'scroll', modelBase: './models' }
);

// For a section: pass scrollElement: document.querySelector('#story').
// For timed playback: use mode: 'time'.
// For your own scroll driver: use mode: 'manual', then experience.seek(0.5).
// On page teardown: experience.destroy().`;
