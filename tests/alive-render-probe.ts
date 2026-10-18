import { Points } from 'three';
import { OrbMesh } from '../src/visual/mesh';
import { MusicVisual } from '../src/composer/music-visual';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { SILENCE } from '../src/audio/meter';
import { VIEW } from '../src/config';
import { wavePositions } from '../src/visual/surface';

function sampleIndices(count: number) {
  const positions = wavePositions(count), indices = Array.from({ length: count }, (_, index) => index);
  const row = indices.reduce((best, index) => Math.abs(positions[index * 3 + 2]) < Math.abs(positions[best * 3 + 2]) ? index : best, 0);
  const sameRow = indices.filter((index) => positions[index * 3 + 2] === positions[row * 3 + 2]);
  return [0, 1.5, 3].map((x) => sameRow.reduce((best, index) => Math.abs(positions[index * 3] - x) < Math.abs(positions[best * 3] - x) ? index : best, row));
}
function centroid(data: Uint8ClampedArray, width: number) {
  let weightedY = 0, weight = 0;
  for (let index = 3; index < data.length; index += 4) { weight += data[index]; weightedY += Math.floor(index / 4 / width) * data[index]; }
  if (weight === 0) throw new Error('Alive sample point is outside the rendered field.');
  return weightedY / weight;
}
export async function aliveMotionProbe() {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay');
  if (!host || !overlay) throw new Error('Alive render fixture is missing.');
  overlay.hidden = true; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!context || !pixels) throw new Error('Alive motion test requires WebGL and pixel inspection.');
  const score = new Score(); score.state.lanes.forEach((lane) => lane.notes.fill(null));
  const visual = new MusicVisual(score, new ScorePlayback(score)); visual.setShape('waves');
  const mesh = new OrbMesh(host, context, visual), render = mesh.renderer.render.bind(mesh.renderer);
  let sample = 0;
  mesh.renderer.render = (scene, camera) => {
    const points = scene.children.find((child) => child instanceof Points);
    if (!points) throw new Error('Alive particle geometry is missing.');
    points.geometry.setDrawRange(sample, 1); render(scene, camera);
  };
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  const at = (index: number, alive: number, time: number) => {
    sample = index; visual.life.setAlive(alive); visual.update(time, 0, SILENCE); visual.life.uniforms.uLifeTime.value = time; mesh.render(time, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return centroid(pixels.getImageData(0, 0, copy.width, copy.height).data, copy.width);
  };
  const indices = sampleIndices(innerWidth < VIEW.mobileWidth ? VIEW.mobileCount : VIEW.desktopCount);
  const samples = indices.map((index) => ({ zero: at(index, 0, 3), zeroLater: at(index, 0, 10), quarter: at(index, 0.25, 3), full: at(index, 1, 3), later: at(index, 1, 10) }));
  mesh.dispose(); return samples;
}
