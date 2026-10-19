import { WebGLRenderer } from 'three';
import { WaveRipples } from '../src/composer/wave-ripples';
import { wrappedPaths, WAVE_WRAP } from '../src/composer/wave-wrap-geometry';
import { RIPPLE } from '../src/composer/ripple-config';
import { compositionFixture } from './composition-fixtures';

export function rippleRenderProbe(width: number, height: number, dense: boolean) {
  const renderer = new WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height); renderer.setClearColor(0, 0); renderer.autoClear = false;
  const effect = new WaveRipples(), score = compositionFixture(dense ? 'custom-polyphony' : 'trio');
  while (dense && score.state.lanes.length < RIPPLE.lanes) score.addLane('melody');
  if (dense) score.state.lanes.forEach(lane => { score.select(lane.id); score.setDensity(36); });
  const layers = score.state.lanes.map(lane => ({ radii: wrappedPaths(lane, 0, []).radii, role: lane.role, energy: 0 }));
  const gl = renderer.getContext(), pixels = () => {
    const buffer = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer); return buffer;
  };
  const draw = (delta: number) => { renderer.info.reset(); renderer.clear(); effect.render(renderer, delta); return pixels(); };
  const difference = (a: Uint8Array, b: Uint8Array) => a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
  effect.setEnabled(true); effect.update(layers);
  const first = draw(0), calls = renderer.info.render.calls, triangles = renderer.info.render.triangles;
  const same = difference(first, draw(0));
  for (let frame = 0; frame < 30; frame++) effect.render(renderer, RIPPLE.frameCap);
  const moving = difference(first, draw(0));
  const centre = centralPixels(first, width, height), visible = first.reduce((sum, value) => sum + value, 0);
  effect.setEnabled(false); const off = draw(1).some(Boolean), offCalls = renderer.info.render.calls;
  effect.setEnabled(true); const resumed = draw(0);
  effect.update(layers.map(layer => ({ ...layer, radii: Float32Array.from(layer.radii, radius => radius + RIPPLE.width) })));
  const reshaped = difference(resumed, draw(0));
  effect.update([]); draw(0); const emptyCalls = renderer.info.render.calls;
  effect.dispose(); draw(0);
  const memory = { ...renderer.info.memory }, error = gl.getError(); renderer.dispose();
  return { calls, triangles, same, moving, centre, visible, off, offCalls, reshaped, emptyCalls, memory, error };
}

function centralPixels(pixels: Uint8Array, width: number, height: number) {
  let total = 0;
  const radius = WAVE_WRAP.radius / WAVE_WRAP.size * Math.min(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (Math.hypot(x - width / 2, y - height / 2) < radius - 2) total += pixels[(y * width + x) * 4 + 3];
  }
  return total;
}
