import '../style.css';
import './style.css';
import { Session } from '../session';
import { SoundEngine } from '../audio/engine';
import { Score } from '../composer/model';
import { element, report, ui } from '../ui';
import { AURA } from './config';
import { auraWorld, loadAura, nextAuraSeed } from './generation';
import { AuraInteraction } from './interaction';
import { AuraPlayback } from './playback';
import { AuraVisual } from './visual';
import { AuraPointer } from './pointer';
import { AuraView } from './view';

function startAura() {
  let world = loadAura(localStorage);
  const score = new Score(world.composition), interaction = new AuraInteraction();
  const playback = new AuraPlayback(score, interaction), visual = new AuraVisual(score, playback, world);
  const view = new AuraView(interaction, world);
  const session = new Session((emit, report) => new SoundEngine(emit, report, playback), () => view.paint(), ui.root, visual);
  const area = element('aura-play', HTMLDivElement), pointer = new AuraPointer(area, interaction);
  const generate = element('aura-generate', HTMLButtonElement);
  generate.addEventListener('click', () => {
    try {
      world = auraWorld(nextAuraSeed(world.seed)); pointer.cancel(); interaction.reset(); playback.reset();
      Object.assign(score.state, world.composition); visual.setWorld(world); view.begin(world);
      try { localStorage.setItem(AURA.storageKey, JSON.stringify({ version: 1, seed: world.seed })); } catch (error) { report(error); }
      void session.start().catch(report);
    } catch (error) { report(error); }
  });
  new MutationObserver(() => {
    const exited = ui.root.dataset.exited === 'true'; generate.disabled = exited; area.inert = exited;
    if (exited) pointer.cancel(); else area.focus({ preventScroll: true });
  }).observe(ui.root, { attributes: true, attributeFilter: ['data-exited'] });
}
try { startAura(); } catch (error) { report(error); }
