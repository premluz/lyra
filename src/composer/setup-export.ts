import { download, message } from '../particle-core/files';
import { element, report } from '../ui';
import type { Score } from './model';
import type { MusicVisual } from './music-visual';
import { isMusicTreatment } from './visual-config';
import { createSetup, SETUP } from './setup';

export function setupExport(score: Score, visual: MusicVisual, metadata?: () => Record<string, unknown>) {
  element('export-setup', HTMLButtonElement).addEventListener('click', () => {
    try {
      const treatment = element('render-treatment', HTMLSelectElement).value;
      if (!isMusicTreatment(treatment)) throw new Error('Unknown render treatment.');
      const setup = createSetup(score.state, { treatment, alive: visual.life.uniforms.uAlive.value, shape: visual.shape });
      const filename = `${SETUP.format}-${setup.createdAt.replaceAll(':', '-')}.json`;
      download(JSON.stringify({ ...setup, ...(metadata ? { authoring: metadata() } : {}) }, null, SETUP.indent) + '\n', filename);
    } catch (error) { report(new Error(`Setup export failed: ${message(error)}`, { cause: error })); }
  });
}
