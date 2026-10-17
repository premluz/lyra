import { afterEach, expect, test, vi } from 'vitest';
import { BeatClock } from '../src/audio/clock';
import { MUSIC } from '../src/config';
import { TICK } from '../src/score';

afterEach(() => { vi.useRealTimers(); });
test('lookahead uses the audio clock, preserves phase, and drops missed ticks', () => {
  vi.useFakeTimers();
  let now = 0;
  const notes: number[] = [], clock = new BeatClock(() => now, (time) => notes.push(time));
  clock.start();
  expect(notes).toEqual([MUSIC.startLead]);
  now = TICK - 0.05; vi.advanceTimersByTime(MUSIC.timerMs);
  expect(notes[1] - notes[0]).toBeCloseTo(TICK);
  now = 3.2; vi.advanceTimersByTime(MUSIC.timerMs);
  expect(notes).toHaveLength(3); expect(notes[2]).toBeGreaterThan(now);
  expect((notes[2] - notes[0]) / TICK).toBeCloseTo(9);
  clock.stop(); now = 6; vi.advanceTimersByTime(1000);
  expect(notes).toHaveLength(3);
});
