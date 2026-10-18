import { OrbMesh } from '../src/visual/mesh';
import { AuraVisual } from '../src/aura/visual';
import { AuraPlayback } from '../src/aura/playback';
import { AuraInteraction } from '../src/aura/interaction';
import { auraWorld } from '../src/aura/generation';
import { AURA } from '../src/aura/config';
import { Score } from '../src/composer/model';
import { SILENCE } from '../src/audio/meter';

async function mountAura(seed: number) {
  const host = document.getElementById('mesh'), overlay = document.getElementById('exit-overlay'), root = document.getElementById('instrument');
  if (!host || !overlay || !root) throw new Error('Aura render fixture is missing.');
  overlay.hidden = true; root.dataset.exited = 'false'; host.querySelector('canvas')?.remove();
  const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('Aura render verification requires WebGL.');
  const world = auraWorld(seed), score = new Score(world.composition), state = new AuraInteraction(), source = new AuraPlayback(score, state);
  const visual = new AuraVisual(score, source, world), mesh = new OrbMesh(host, context, visual);
  const copy = document.createElement('canvas'), pixels = copy.getContext('2d');
  if (!pixels) throw new Error('Aura pixel inspection is unavailable.');
  await new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(host); });
  visual.uniforms.uAuraTime.value = 4;
  const capture = (time = 3) => {
    visual.update(time, 0, SILENCE); mesh.render(time, 0, 0);
    copy.width = canvas.width; copy.height = canvas.height; pixels.drawImage(canvas, 0, 0);
    return pixels.getImageData(0, 0, copy.width, copy.height).data;
  };
  return { visual, capture, source, state, world };
}
function difference(a: Uint8ClampedArray, b: Uint8ClampedArray) { return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0); }
export async function auraRenderProbe(seed: number) {
  const { visual, capture, source, state, world } = await mountAura(seed), rest = capture();
  visual.uniforms.uAuraForm.value = 0; const firstForm = capture();
  visual.uniforms.uAuraForm.value = 2; const form = difference(firstForm, capture()); visual.uniforms.uAuraForm.value = world.form;
  state.move({ x: -1.5, y: 0.5, z: 2.5, nx: 0.3, depth: 0.2 }, 0.3, 0.2, 0.8); state.advance(1);
  const hover = difference(rest, capture()); state.press(); state.advance(AURA.openAt + 0.2); const open = capture();
  state.advance(AURA.bloomAt); const bloom = difference(open, capture());
  visual.reset(); const clean = capture();
  visual.note({ ...source.note('melody', 0), midi: 62, time: 4, user: true });
  const future = difference(clean, capture()), pulse = difference(clean, capture(4.1));
  visual.reset(); capture();
  return { form, hover, bloom, future, pulse };
}
