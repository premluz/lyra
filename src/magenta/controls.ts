import type { Score } from '../composer/model';
import { element, report } from '../ui';
import { MelodyGeneration } from './generation';

export function generationControls(score: Score, activate: () => Promise<void>) {
  const button = element('randomise', HTMLButtonElement), cancel = element('cancel-generation', HTMLButtonElement);
  const label = element('model-status', HTMLSpanElement);
  const generation = new MelodyGeneration(score, (message, busy) => {
    label.textContent = message; button.disabled = busy; button.textContent = busy ? 'Composing…' : 'Randomise';
    cancel.hidden = !busy; element('instrument', HTMLElement).dataset.generating = String(busy);
  }, activate);
  cancel.addEventListener('click', () => generation.cancel());
  new MutationObserver(() => { if (element('instrument', HTMLElement).dataset.exited === 'true' && generation.busy) generation.cancel(); })
    .observe(element('instrument', HTMLElement), { attributes: true, attributeFilter: ['data-exited'] });
  window.addEventListener('pagehide', () => generation.cancel());
  return () => { void activate().then(() => generation.generate()).catch(report); };
}
