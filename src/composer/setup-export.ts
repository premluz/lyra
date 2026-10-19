import { download, message } from '../particle-core/files';
import { element, report, ui } from '../ui';
import { MP3_EXPORT, renderMp3 } from './mp3-export';
import type { Score } from './model';
import type { MusicVisual } from './music-visual';
import { isMusicTreatment } from './visual-config';
import { createSetup, SETUP } from './setup';

function exportSource(score: Score, visual: MusicVisual, metadata?: () => Record<string, unknown>) {
  try {
    const treatment = element('render-treatment', HTMLSelectElement).value;
    if (!isMusicTreatment(treatment)) throw new Error('Unknown render treatment.');
    const setup = createSetup(score.state, { treatment, alive: visual.life.uniforms.uAlive.value, shape: visual.shape });
    const filename = `${SETUP.format}-${setup.createdAt.replaceAll(':', '-')}.json`;
    download(JSON.stringify({ ...setup, ...(metadata ? { authoring: metadata() } : {}) }, null, SETUP.indent) + '\n', filename);
  } catch (error) { report(new Error(`Setup export failed: ${message(error)}`, { cause: error })); }
}

function exportAudio(score: Score) {
  const button = element('export-mp3', HTMLButtonElement);
  button.disabled = true; ui.status.textContent = `Rendering approximately ${MP3_EXPORT.targetSeconds / 60}-minute MP3…`;
  void renderMp3(score).then((blob) => {
    const filename = `lyra-mix-${new Date().toISOString().replaceAll(':', '-')}.mp3`;
    download(blob, filename, 'audio/mpeg'); ui.status.textContent = 'MP3 exported.';
  }).catch((error: unknown) => report(new Error(`MP3 export failed: ${message(error)}`, { cause: error })))
    .finally(() => { button.disabled = false; });
}

export function setupExport(score: Score, visual: MusicVisual, metadata?: () => Record<string, unknown>) {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('#export-source')) exportSource(score, visual, metadata);
    if (event.target.closest('#export-mp3')) exportAudio(score);
  });
}
