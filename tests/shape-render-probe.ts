import { OrbMesh } from '../src/visual/mesh';
import { MusicVisual } from '../src/composer/music-visual';
import { ScorePlayback } from '../src/composer/playback';
import { compositionFixture } from './composition-fixtures';
import { SILENCE } from '../src/audio/meter';

export async function shapeRenderProbe(variant: 'trio' | 'custom-polyphony') {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay');
  if (!host || !overlay) throw new Error('Shape render fixture is missing.');
  overlay.hidden = true; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('Shape render test requires WebGL.');
  const score = compositionFixture(variant), source = new ScorePlayback(score), visual = new MusicVisual(score, source), mesh = new OrbMesh(host, context, visual);
  visual.life.setAlive(0);
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!pixels) throw new Error('Shape pixel inspection is unavailable.');
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  const capture = (time: number, active = false) => {
    visual.update(time, 10, active ? { level: 0.04, bass: 0.6, mid: 0.7, treble: 0.3 } : SILENCE);
    visual.life.uniforms.uLifeTime.value = time; mesh.render(time, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return pixels.getImageData(0, 0, copy.width, copy.height).data;
  };
  const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
  const orb = capture(3); visual.setShape('waves');
  const select = document.getElementById('visual-shape');
  if (!(select instanceof HTMLSelectElement)) throw new Error('Shape render selector is missing.');
  select.value = 'waves'; host.dataset.shape = 'waves';
  const rest = capture(3), geometry = difference(orb, rest);
  const lane = score.state.lanes.find((lane) => lane.role === 'melody');
  if (!lane) throw new Error('Shape fixture has no melody.');
  visual.note({ ...source.note(lane.id, 0), midi: 50, time: 4, user: true });
  const future = difference(rest, capture(3)), playing = capture(4.1, true), onset = difference(rest, playing);
  const rect = host.getBoundingClientRect(), point = mesh.point(rect.left + rect.width * 0.4, rect.top + rect.height * 0.55);
  mesh.move(point, 0.3); const hover = capture(4.1, true); mesh.hold(true); const held = capture(4.1, true);
  mesh.hold(false); mesh.leave(); visual.setTreatment('halftone'); const ink = capture(4.1, true);
  visual.setTreatment('glow'); const glow = capture(4.1, true);
  return { geometry, future, onset, hover: difference(playing, hover), hold: difference(hover, held), treatment: difference(ink, glow),
    lit: glow.filter((value, index) => index % 4 !== 3 && value > 0).length, point };
}
