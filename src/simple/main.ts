import '../style.css';
import '../composer/style.css';
import './style.css';
import { Session } from '../session';
import { SoundEngine } from '../audio/engine';
import { Score } from '../composer/model';
import { ScorePlayback } from '../composer/playback';
import { MusicVisual } from '../composer/music-visual';
import { MUSIC } from '../config';
import { TICK } from '../score';
import { ui, report } from '../ui';
import { SIMPLE } from './config';
import { newDrawing, loadDrawing } from './score';
import { DrawingFlow } from './flow';
import { shapeControl } from '../visual/shape-control';

function startDrawing() {
  const saved = loadDrawing(localStorage);
  let flow: DrawingFlow | null = null;
  let visual: MusicVisual | null = null;
  const changed = () => {
    try { localStorage.setItem(SIMPLE.storageKey, JSON.stringify(score.state)); } catch (error) { report(error); }
    flow?.update(); visual?.invalidate();
  };
  const score = new Score(saved ?? newDrawing(), changed), playback = new ScorePlayback(score);
  visual = new MusicVisual(score, playback); visual.life.setAlive(SIMPLE.alive);
  shapeControl(visual);
  let sound: SoundEngine | null = null;
  const session = new Session((emit, report) => {
    sound = new SoundEngine((event) => {
      emit(event); if (event.lane && event.step !== undefined) flow?.surface.note(event.lane, event.time, event.step);
    }, report, playback);
    return sound;
  }, (time) => flow?.paint(time, playback.elapsed(time), playback.phrase(time)), ui.root, visual);
  flow = new DrawingFlow(score, saved !== null, changed, () => session.start(), async () => {
    await sound?.close(); await session.start();
  }, () => playback.elapsed(sound?.time ?? 0) < 0 ? 0 : playback.elapsed(sound?.time ?? 0) + MUSIC.lookahead / TICK);
}
try { startDrawing(); } catch (error) { report(error); }
