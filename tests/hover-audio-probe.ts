import { AudioGraph } from '../src/audio/graph';
import { HoverInstrument } from '../src/audio/hover';
import { SCALE } from '../src/score';
import type { NoteEvent } from '../src/score';

export async function hoverAudioProbe() {
  const rate = 12000, context = new OfflineAudioContext(2, rate * 14, rate), graph = new AudioGraph(context), events: NoteEvent[] = [];
  const hover = new HoverInstrument((event) => events.push(event), (index) => SCALE[index]);
  hover.connect(context, graph.notes, graph.mix, () => 1); graph.mute(false);
  const point = { x: -1, y: 1, z: 2.5, nx: 0.3, depth: 0.4, proximity: 0.15 };
  const at = (time: number, action: () => void) => context.suspend(time).then(async () => { action(); await context.resume(); });
  const changes = [
    at(1, () => { hover.move(point); hover.schedule(1.025, 0); }),
    at(3, () => { hover.move({ ...point, proximity: 1 }); hover.request({ ...point, proximity: 1 }, 0.7, true); hover.schedule(3.025, 6); }),
    at(5, () => hover.press({ ...point, proximity: 1 })),
    at(7, () => { hover.request({ ...point, proximity: 1 }, 0.7, true); hover.leave(); hover.schedule(7.025, 20); }),
  ];
  const data = (await context.startRendering()).getChannelData(0); await Promise.all(changes); hover.dispose();
  const rms = (second: number) => {
    const part = data.slice(second * rate, (second + 0.2) * rate); return Math.sqrt(part.reduce((sum, value) => sum + value * value, 0) / part.length);
  };
  let peak = 0; for (const value of data) peak = Math.max(peak, Math.abs(value));
  return { idle: rms(0.5), edge: rms(2.6), near: rms(4.6), held: rms(6.6), ended: rms(13), peak, events };
}
