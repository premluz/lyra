import { ScorePlayback } from '../src/composer/playback';
import type { FormId } from '../src/composer/composition-config';
import { Voices } from '../src/audio/voices';
import { AudioGraph } from '../src/audio/graph';
import { TICK } from '../src/score';
import { COMPOSE } from '../src/composer/config';
import { compositionFixture } from './composition-fixtures';
import { random, setSeed } from '../src/particle-core/random';
import { Score } from '../src/composer/model';
import { randomiseV2 } from '../src/composer/v2/generator';

export async function articulationProbe(form: FormId) {
  const score = compositionFixture(); score.setForm(form);
  score.state.lanes.forEach((lane) => { lane.enabled = lane.role === 'melody'; lane.notes.fill(null); lane.notes[0] = 4; lane.notes[8] = 7; lane.instrument = 'pluck'; });
  const rate = 12000, context = new OfflineAudioContext(1, rate * 16, rate), source = new ScorePlayback(score);
  const voices = new Voices(context, context.destination, () => source.voiceLimit());
  for (const tick of [0, 8]) for (const note of source.schedule(0.025 + tick * TICK, tick)) voices.pluck(source.midi(note.index), 0.025 + tick * TICK + (note.delay ?? 0), note.velocity, note.point.depth, note.shape);
  const data = (await context.startRendering()).getChannelData(0);
  const rms = (time: number) => {
    const part = data.slice(time * rate, (time + 0.1) * rate); return Math.sqrt(part.reduce((sum, value) => sum + value * value, 0) / part.length);
  };
  return { onset: rms(0.05), gap: rms(2), ending: rms(0.025 + 8 * TICK + 1), late: rms(14) };
}
export async function arrangementMixProbe(form: FormId, generated?: { seed: number; variant: 'trio' | 'custom-polyphony'; v2?: boolean }, velocityScale = 1) {
  const fixture = compositionFixture(generated?.variant ?? 'custom-polyphony');
  const score = generated?.v2 ? new Score(fixture.state, undefined, randomiseV2) : fixture;
  if (generated) { setSeed(generated.seed); score.randomise(random); }
  score.setForm(form);
  const rate = 12000, context = new OfflineAudioContext(2, rate * 50, rate), graph = new AudioGraph(context), source = new ScorePlayback(score);
  graph.mute(false); const voices = new Voices(context, graph.notes, () => source.voiceLimit());
  for (let tick = 0; tick < COMPOSE.steps * 4; tick++) {
    for (const note of source.schedule(0.025 + tick * TICK, tick)) voices.pluck(source.midi(note.index), 0.025 + tick * TICK + (note.delay ?? 0), note.velocity * velocityScale, note.point.depth, note.shape);
  }
  const data = (await context.startRendering()).getChannelData(0);
  let peak = 0, energy = 0; for (const value of data) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
  return { peak, energy, finite: data.every((value) => Number.isFinite(value)) };
}
