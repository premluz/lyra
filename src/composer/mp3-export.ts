import { MUSIC } from '../config';
import { TICK } from '../score';
import { AudioGraph } from '../audio/graph';
import { SustainedBank } from '../audio/sustained';
import { voiceEnvelope } from '../audio/envelope';
import { Voices } from '../audio/voices';
import { COMPOSE } from './config';
import { COMPOSITION } from './composition-config';
import { laneForm } from './composition';
import { isContinuous } from './lanes';
import type { Score } from './model';
import { ScorePlayback } from './playback';

export const MP3_EXPORT = { targetSeconds: 5 * 60, sampleRate: 44_100, channels: 2, bitrate: 192, encodeChunkSeconds: 1, tailPaddingSeconds: 1, fadeSeconds: 3 } as const;

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number) { return a / gcd(a, b) * b; }
export function arrangementTicks(score: Score) {
  const melodic = score.state.lanes.filter((lane) => lane.enabled && !isContinuous(lane));
  const formTicks = melodic.some((lane) => laneForm(lane, score.state.form) !== 'loop') ? COMPOSE.steps * COMPOSITION.phrases : COMPOSE.steps;
  return score.state.lanes.reduce((ticks, lane) => {
    if (!lane.enabled || isContinuous(lane)) return ticks;
    const period = COMPOSE.steps / lane.rate;
    if (!Number.isInteger(period)) throw new Error(`Lane ${lane.name} has an unsupported loop length.`);
    return lcm(ticks, period);
  }, formTicks);
}
function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function mp3Timing(score: Score) {
  const playback = new ScorePlayback(score), ticks = arrangementTicks(score), loopSeconds = ticks * TICK;
  const scheduled = Array.from({ length: ticks }, (_, tick) => ({ time: tick * TICK, notes: playback.schedule(tick * TICK, tick) }));
  const frame = playback.continuous();
  const lastNoteEnd = scheduled.reduce((latest, slot) => slot.notes.reduce((end, note) =>
    Math.max(end, slot.time + (note.delay ?? 0) + voiceEnvelope(note.shape).duration), latest), loopSeconds);
  const release = frame.lanes.reduce((longest, lane) => Math.max(longest, lane.release), 0);
  const tailSeconds = Math.max(lastNoteEnd - loopSeconds, release, MUSIC.reverbSeconds * 4, MUSIC.delayBeats * 60 / MUSIC.bpm * 8) + MP3_EXPORT.tailPaddingSeconds;
  const repeats = Math.max(1, Math.round((MP3_EXPORT.targetSeconds - tailSeconds) / loopSeconds));
  const musicSeconds = loopSeconds * repeats;
  return { ticks, repeats, loopSeconds, musicSeconds, tailSeconds, duration: musicSeconds + tailSeconds, scheduled, frame, playback };
}

export async function renderMp3(score: Score): Promise<Blob> {
  const plan = mp3Timing(score), { playback } = plan;
  const context = new OfflineAudioContext(MP3_EXPORT.channels, Math.ceil(plan.duration * MP3_EXPORT.sampleRate), MP3_EXPORT.sampleRate);
  const graph = new AudioGraph(context), voices = new Voices(context, graph.notes, () => playback.voiceLimit(), () => playback.tuning());
  const sustained = new SustainedBank(context, graph); sustained.sync(plan.frame, 0); graph.mute(false);
  for (let repeat = 0; repeat < plan.repeats; repeat++) plan.scheduled.forEach(({ time, notes }) => notes.forEach((note) => {
    voices.pluck(playback.midi(note.index), repeat * plan.loopSeconds + time + (note.delay ?? 0), note.velocity, note.point.depth, note.shape);
  }));
  sustained.sync({ ...plan.frame, lanes: [] }, plan.musicSeconds);
  graph.fadeOut(MP3_EXPORT.fadeSeconds, plan.duration - MP3_EXPORT.fadeSeconds);
  const rendered = await context.startRendering();
  return encode(rendered);
}

async function encode(buffer: AudioBuffer): Promise<Blob> {
  const { default: createEncoder } = await import('@audio/encode-mp3');
  const encoder = await createEncoder({ sampleRate: buffer.sampleRate, channels: MP3_EXPORT.channels, bitrate: MP3_EXPORT.bitrate });
  const channels = Array.from({ length: MP3_EXPORT.channels }, (_, index) => buffer.getChannelData(index));
  const chunkSize = buffer.sampleRate * MP3_EXPORT.encodeChunkSeconds, chunks: ArrayBuffer[] = [];
  try {
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      const encoded = encoder.encode(channels.map((channel) => channel.subarray(offset, Math.min(offset + chunkSize, buffer.length))));
      if (encoded.length) chunks.push(arrayBuffer(encoded));
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    const final = encoder.flush();
    if (final.length) chunks.push(arrayBuffer(final));
  } finally { encoder.free(); }
  return new Blob(chunks, { type: 'audio/mpeg' });
}
