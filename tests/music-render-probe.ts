import { OrbMesh } from '../src/visual/mesh';
import { MusicVisual } from '../src/composer/music-visual';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { SILENCE } from '../src/audio/meter';

export async function musicRenderProbe() {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay');
  if (!host || !overlay) throw new Error('Music render fixture is missing.');
  overlay.hidden = true; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('Music visualisation test requires WebGL.');
  const score = new Score(), playback = new ScorePlayback(score), visual = new MusicVisual(score, playback), mesh = new OrbMesh(host, context, visual);
  visual.life.setAlive(0);
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!pixels) throw new Error('Pixel inspection is unavailable.');
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  const capture = (time: number, active = false) => {
    visual.update(time, 10, active ? { level: 0.04, bass: 0.6, mid: 0.7, treble: 0.3 } : SILENCE); mesh.render(time, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return pixels.getImageData(0, 0, copy.width, copy.height).data;
  };
  const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0);
  const rest = capture(3), note = playback.note('melody', 0);
  visual.note({ ...note, midi: 50, time: 4, user: true });
  const future = difference(rest, capture(3)), playing = capture(4.08, true), onset = difference(rest, playing);
  const tail = difference(rest, capture(8));
  score.select('air'); score.setDensity(17); score.setInstrument('glass'); score.setKnob('lift', 1); visual.invalidate();
  const changedScore = difference(rest, capture(3));
  visual.note({ ...playback.note('air', 2), midi: 86, time: 4, user: true });
  const secondVoice = difference(playing, capture(4.08, true));
  visual.setTreatment('halftone'); const treatment = difference(playing, capture(4.08, true));
  visual.setTreatment('glow'); capture(4.08, true);
  return { future, onset, tail, changedScore, secondVoice, treatment };
}
