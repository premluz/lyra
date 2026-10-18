import { auraWorld } from '../src/aura/generation';
import { AuraInteraction } from '../src/aura/interaction';
import { AuraPlayback } from '../src/aura/playback';
import { AURA } from '../src/aura/config';
import { Score } from '../src/composer/model';
import { TICK } from '../src/score';
import { AudioGraph } from '../src/audio/graph';
import { Voices } from '../src/audio/voices';

export async function auraAudioProbe(seed: number) {
  const rate = 12000, duration = 18, context = new OfflineAudioContext(2, rate * duration, rate);
  const graph = new AudioGraph(context), state = new AuraInteraction(), source = new AuraPlayback(new Score(auraWorld(seed).composition), state);
  const voices = new Voices(context, graph.notes, () => source.voiceLimit(), () => source.tuning()); graph.mute(false);
  let gestures = 0, accepted = 0;
  for (let tick = 0; tick * TICK < duration - 4; tick++) {
    const time = tick * TICK;
    state.move({ x: Math.sin(tick), y: 1, z: 2, nx: tick % 10 / 10, depth: 0.3 }, tick % 10 / 10, tick % 7 / 7, 0.5);
    if (tick === 2) state.press(); if (tick === 22) state.release(); state.advance(TICK);
    for (const note of source.schedule(time, tick)) {
      if (note.lane === AURA.touchLane) gestures++;
      if (voices.pluck(source.midi(note.index), time + (note.delay ?? 0), note.velocity, note.point.depth, note.shape)) accepted++;
    }
  }
  const data = (await context.startRendering()).getChannelData(0);
  let peak = 0, power = 0, finite = true;
  for (const value of data) { peak = Math.max(peak, Math.abs(value)); power += value * value; finite &&= Number.isFinite(value); }
  return { peak, rms: Math.sqrt(power / data.length), finite, gestures, accepted };
}
