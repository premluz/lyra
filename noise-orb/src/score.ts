import { MUSIC, clamp } from './config';
import type { VoiceEnvelope } from './audio/envelope';
export const SCALE = Array.from({ length: MUSIC.octaves * MUSIC.intervals.length + 1 }, (_, i) =>
  MUSIC.root + Math.floor(i / MUSIC.intervals.length) * 12 + MUSIC.intervals[i % MUSIC.intervals.length]);
export const TICK = 60 / MUSIC.bpm / MUSIC.subdivisions;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export interface TouchPoint { x: number; z: number; nx: number; depth: number; y?: number; proximity?: number }
export interface NoteEvent { time: number; index: number; midi: number; velocity: number; point: TouchPoint; user: boolean; lane?: string; step?: number; envelope?: VoiceEnvelope }
export class NotePolicy {
  private previous = -1;
  private repeats = 0;
  checkpoint() { return { previous: this.previous, repeats: this.repeats }; }
  restore(state: ReturnType<NotePolicy['checkpoint']>) { this.previous = state.previous; this.repeats = state.repeats; }

  choose(requested: number) {
    let index = Math.round(clamp(requested, 0, SCALE.length - 1));
    if (this.previous >= 0) {
      while (index - this.previous > MUSIC.maxLeap) index -= MUSIC.intervals.length;
      while (this.previous - index > MUSIC.maxLeap) index += MUSIC.intervals.length;
    }
    if (index === this.previous && this.repeats >= 2) index += index === SCALE.length - 1 ? -1 : 1;
    this.repeats = index === this.previous ? this.repeats + 1 : 1;
    this.previous = index;
    return index;
  }
}
export function pitchAt(point: TouchPoint, tap: boolean) {
  const horizontal = Math.round(clamp(point.nx) * (SCALE.length - 1));
  if (!tap) return horizontal;
  const pitchClass = horizontal % MUSIC.intervals.length;
  const octave = Math.round(clamp(point.depth) * (MUSIC.octaves - 1));
  return pitchClass + octave * MUSIC.intervals.length;
}
