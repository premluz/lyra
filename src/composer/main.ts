import '../style.css';
import './style.css';
import './studio.css';
import '../magenta/style.css';
import { Session } from '../session';
import { SoundEngine } from '../audio/engine';
import { element, report, ui } from '../ui';
import { Score } from './model';
import { loadComposition } from './storage';
import { ScorePlayback } from './playback';
import { WaveDock } from './dock';
import { Arrangement } from './arrangement';
import { isContinuous } from './lanes';
import { MusicVisual } from './music-visual';
import { visualControls } from './visual-controls';
import { setupExport } from './setup-export';
import { studioMode } from './mode';
import { generationControls } from '../magenta/controls';
import { MAGENTA } from '../magenta/config';
import { WaveWrap } from './wave-wrap';

function startComposer() {
  const mode = studioMode(ui.root.dataset.composer);
  let dock: WaveDock | null = null;
  let arrangement: Arrangement | null = null;
  let visual: MusicVisual | null = null;
  let wrapped: WaveWrap | null = null;
  const score = new Score(loadComposition(localStorage, mode.key, mode.initial), () => {
    try { localStorage.setItem(mode.key, JSON.stringify(score.state)); } catch (error) { report(error); }
    dock?.update(); arrangement?.update(); visual?.invalidate(); wrapped?.update();
  }, mode.generator);
  const playback = new ScorePlayback(score);
  visual = new MusicVisual(score, playback); visualControls(visual);
  setupExport(score, visual, mode.magenta ? () => ({ engine: 'MusicVAE', model: MAGENTA.model }) : undefined);
  let sound: SoundEngine | null = null;
  const session = new Session((emit, report) => {
    sound = new SoundEngine((event) => {
      emit(event);
      if (event.lane && event.step !== undefined) { dock?.surface.note(event.lane, event.time, event.step); wrapped?.note(event.lane, event.time, event.step); }
    }, report, playback, true);
    return sound;
  }, (time) => { dock?.paint(time, playback.elapsed(time), playback.phrase(time)); wrapped?.paint(time, playback.elapsed(time)); }, ui.root, visual);
  const audition = (step: number, preview = true) => {
    const note = playback.note(score.state.selected, step);
    if (preview && !isContinuous(score.selected) && score.selected.enabled && note.velocity > 0) sound?.preview(note);
    void session.start().catch(report);
  };
  wrapped = new WaveWrap(score, audition);
  dock = new WaveDock(score, audition, mode.magenta ? generationControls(score, () => session.start()) : undefined);
  arrangement = new Arrangement(score, () => { void session.start().catch(report); }, () => session.fadeOut(score.state.fadeSeconds)); arrangement.update();
  const host = element('composer', HTMLElement);
  new MutationObserver(() => { host.inert = ui.root.dataset.exited === 'true'; if (host.inert) { arrangement?.resetFade(); wrapped?.cancel(); } }).observe(ui.root, { attributes: true, attributeFilter: ['data-exited'] });
}
try { startComposer(); } catch (error) { report(error); }
