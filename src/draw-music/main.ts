import '../style.css';
import '../composer/style.css';
import '../simple/style.css';
import './style.css';
import { Session } from '../session';
import { SoundEngine } from '../audio/engine';
import { ScorePlayback } from '../composer/playback';
import { MusicVisual } from '../composer/music-visual';
import { setupExport } from '../composer/setup-export';
import { ui, report } from '../ui';
import { MAGENTA } from '../magenta/config';
import { DrawDocument } from './document';
import { DrawController } from './controller';
import { LiveStroke } from './live';
import { DRAW_MUSIC as D } from './config';

function startDrawMusic() {
  let controller: DrawController | null = null, visual: MusicVisual | null = null;
  const document = new DrawDocument(localStorage, () => { controller?.update(); visual?.invalidate(); });
  const playback = new ScorePlayback(document.score); visual = new MusicVisual(document.score, playback); visual.life.setAlive(D.alive);
  let sound: SoundEngine | null = null;
  const session = new Session((emit, report) => {
    sound = new SoundEngine(event => { emit(event); if (event.lane && event.step !== undefined) controller?.surface.note(event.lane, event.time, event.step); }, report, playback);
    return sound;
  }, time => controller?.paint(time, playback.elapsed(time)), ui.root, visual);
  const live = new LiveStroke(document.score, () => sound, () => session.start());
  controller = new DrawController(document, live, () => session.start(), async () => { await sound?.close(); await session.start(); });
  setupExport(document.score, visual, () => ({ engine: 'MusicVAE', model: MAGENTA.model, authoredLayers: document.data.authored, interpretation: document.data.interpretation }));
}
try { startDrawMusic(); } catch (error) { report(error); }
