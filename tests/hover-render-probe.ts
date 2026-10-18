import { OrbMesh } from '../src/visual/mesh';
import { MusicVisual } from '../src/composer/music-visual';
import { Score } from '../src/composer/model';
import { ScorePlayback } from '../src/composer/playback';
import { SILENCE } from '../src/audio/meter';

function pixelDifference(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number) {
  let left = 0, right = 0, brightness = 0;
  for (let i = 0; i < a.length; i += 4) {
    const difference = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (i / 4 % width < width / 2) left += difference; else right += difference;
    brightness += b[i] + b[i + 1] + b[i + 2];
  }
  return { left, right, brightness, total: left + right };
}
export async function hoverRenderProbe() {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay');
  if (!host || !overlay) throw new Error('Hover render fixture is missing.');
  overlay.hidden = true; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('Hover render test requires WebGL.');
  const score = new Score(); score.state.lanes.forEach((lane) => lane.notes.fill(null));
  const visual = new MusicVisual(score, new ScorePlayback(score)), mesh = new OrbMesh(host, context, visual);
  visual.life.setAlive(0);
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!pixels) throw new Error('Pixel inspection is unavailable.');
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  const capture = (time = 3) => {
    visual.update(time, 10, SILENCE); visual.life.uniforms.uLifeTime.value = time; mesh.render(time, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return pixels.getImageData(0, 0, copy.width, copy.height).data;
  };
  const rest = capture(), point = { x: -1.6, y: 1.1, z: 2.3, nx: 0.3, depth: 0.3, proximity: 1 };
  mesh.move(point, 0); const hover = capture(), local = pixelDifference(rest, hover, copy.width);
  mesh.hold(true); const pressed = pixelDifference(rest, capture(), copy.width);
  mesh.leave(); const released = pixelDifference(rest, capture(), copy.width);
  visual.life.setAlive(0.5); const idle = capture(); const alive = pixelDifference(idle, capture(10), copy.width);
  return { local, pressed, released, alive };
}
