import '../style.css';
import '../composer/style.css';
import '../simple/style.css';
import './style.css';
import { Session } from '../session';
import { SoundEngine } from '../audio/engine';
import { Score } from '../composer/model';
import { element, report, ui } from '../ui';
import { SCULPT } from './config';
import { loadSculpt, newSculpt } from './storage';
import { SculptPlayback } from './playback';
import { SculptVisual } from './visual';
import { SculptController } from './controller';
import { SculptPanel } from './panel';
import { SculptPointer } from './pointer';

function startSculpting() {
  const setup = loadSculpt(localStorage);
  let panel: SculptPanel | null = null, visual: SculptVisual | null = null;
  const changed = (persist = true) => {
    visual?.invalidate(); visual?.setHandles(setup.handles); panel?.update();
    if (persist) { try { localStorage.setItem(SCULPT.storageKey, JSON.stringify({ composition: score.state, handles: setup.handles })); } catch (error) { report(error); } }
  };
  const score = new Score(setup.composition, changed), playback = new SculptPlayback(score);
  visual = new SculptVisual(score, playback);
  let sound: SoundEngine | null = null;
  const session = new Session((emit, report) => {
    sound = new SoundEngine((event) => {
      emit(event); if (event.lane && event.step !== undefined) panel?.surface.note(event.lane, event.time, event.step);
    }, report, playback); return sound;
  }, (time) => panel?.paint(time, playback.elapsed(time), playback.phrase(time)), ui.root, visual);
  const activate = () => { void session.start().catch(report); };
  const controller = new SculptController(score, setup.handles, changed);
  panel = new SculptPanel(score, controller, activate);
  const pointer = new SculptPointer(element('sculpt-area', HTMLDivElement), controller, visual, playback, activate);
  bindSession(controller, pointer, session, () => sound, changed); changed();
}
function bindSession(controller: SculptController, pointer: SculptPointer, session: Session, sound: () => SoundEngine | null, changed: () => void) {
  const button = element('new-tune', HTMLButtonElement), panel = element('simple-score', HTMLElement);
  button.addEventListener('click', () => {
    pointer.cancel(); controller.clear(); Object.assign(controller.score.state, newSculpt().composition); changed();
    void (async () => { await sound()?.close(); await session.start(); })().catch(report);
  });
  new MutationObserver(() => {
    const exited = ui.root.dataset.exited === 'true';
    if (exited) pointer.cancel();
    panel.inert = exited; button.disabled = exited; element('sculpt-area', HTMLDivElement).inert = exited;
    element('undo-shape', HTMLButtonElement).disabled = exited || !controller.canUndo;
  }).observe(ui.root, { attributes: true, attributeFilter: ['data-exited'] });
}
try { startSculpting(); } catch (error) { report(error); }
