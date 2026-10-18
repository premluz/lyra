import { OrbMesh } from '../src/visual/mesh';
import { SculptVisual } from '../src/sculpt/visual';
import { SculptPlayback } from '../src/sculpt/playback';
import { Score } from '../src/composer/model';
import { SILENCE } from '../src/audio/meter';
import { Voices } from '../src/audio/voices';
import { sculptFixture } from './sculpt-fixtures';
import { sculptLane } from '../src/sculpt/model';

async function mountSculpt(dense: boolean) {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay');
  if (!host || !overlay) throw new Error('Sculpt render fixture is missing.');
  overlay.hidden = true; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('Sculpt render verification requires WebGL.');
  const score = new Score(sculptFixture(dense).composition), source = new SculptPlayback(score), visual = new SculptVisual(score, source);
  const mesh = new OrbMesh(host, context, visual); visual.base.life.setAlive(0);
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!pixels) throw new Error('Sculpt pixel inspection is unavailable.');
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  const capture = () => {
    visual.update(3, 10, SILENCE); mesh.render(3, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return pixels.getImageData(0, 0, copy.width, copy.height).data;
  };
  return { score, source, visual, capture, canvas };
}
function difference(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number) {
  let left = 0, right = 0;
  for (let i = 0; i < a.length; i += 4) {
    const delta = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (i / 4 % width < width / 2) left += delta; else right += delta;
  }
  return { left, right, total: left + right };
}
export async function sculptRenderProbe(dense: boolean) {
  const { score, visual, capture, canvas } = await mountSculpt(dense), rest = capture();
  const handles = [{ lane: 'melody', anchor: { x: -1.8, y: 0, z: 2.4 }, offset: { x: -0.7, y: 1.1, z: 0 } }];
  visual.setHandles(handles); const changed = capture(), local = difference(rest, changed, canvas.width);
  visual.base.setTreatment('halftone'); const treatment = difference(changed, capture(), canvas.width).total;
  visual.base.setTreatment('glow'); visual.setHandles([]); const restored = difference(rest, capture(), canvas.width).total;
  visual.setHandles(handles); capture();
  const feedback = document.getElementById('sculpt-feedback');
  if (!feedback) throw new Error('Sculpt baseline has no feedback label.');
  feedback.textContent = `${score.selected.name} · 1 sculpt point`;
  return { local, treatment, restored };
}
async function renderNote(source: SculptPlayback) {
  const rate = 12000, context = new OfflineAudioContext(1, rate * 4, rate), note = source.note('melody', 0);
  new Voices(context, context.destination).pluck(source.midi(note.index), 0.025, note.velocity, note.point.depth, note.shape);
  const samples = (await context.startRendering()).getChannelData(0);
  return { power: samples.reduce((sum, sample) => sum + sample * sample, 0), peak: samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0),
    crossings: samples.reduce((sum, sample, index) => sum + (index > 0 && sample * samples[index - 1] < 0 ? 1 : 0), 0) };
}
export async function sculptAudioProbe() {
  const score = new Score(sculptFixture(true).composition), source = new SculptPlayback(score);
  score.selected.instrument = 'marimba'; score.selected.tone = 0; score.selected.notes.fill(4);
  const rest = await renderNote(source);
  source.aim({ proximity: 1, height: 0.5, depth: 0.5 }); source.advance(10); const near = await renderNote(source);
  Object.assign(score.selected, sculptLane(score.selected, { x: 0, y: 0, z: 3 }, { x: 0.8, y: 1.5, z: 0 }));
  const shaped = await renderNote(source);
  return { rest, near, shaped };
}
