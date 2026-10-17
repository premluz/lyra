import { expect, test } from 'vitest';
import { compositionFixture } from './composition-fixtures';
import { RATES, laneTicks } from '../src/composer/pace';
import { ScorePlayback } from '../src/composer/playback';
import { COMPOSE } from '../src/composer/config';
import { TICK } from '../src/score';
import { parseComposition } from '../src/composer/storage';
import { MusicVisual } from '../src/composer/music-visual';
import { SILENCE } from '../src/audio/meter';

for (const variant of ['trio', 'custom-polyphony'] as const) {
  for (const { value: rate } of RATES) {
    test(`${variant} at ${rate}× schedules every local step once, including wraps, on the audio clock`, () => {
      const score = compositionFixture(variant), lane = score.state.lanes.find((lane) => lane.role === 'melody');
      if (!lane) throw new Error('Fixture has no melody.');
      score.select(lane.id); score.setRate(rate); lane.notes.fill(2);
      score.state.lanes.forEach((item) => { item.enabled = item.id === lane.id; });
      const source = new ScorePlayback(score), origin = 0.025;
      const notes = Array.from({ length: COMPOSE.steps * 4 }, (_, tick) => source.schedule(origin + tick * TICK, tick)
        .map((note) => ({ ...note, time: origin + tick * TICK + (note.delay ?? 0) }))).flat();
      expect(notes).toHaveLength(COMPOSE.steps * 4 * rate);
      notes.forEach((note, index) => {
        expect(note.time).toBeCloseTo(origin + index * TICK / rate, 10); expect(note.step).toBe(index % COMPOSE.steps);
        expect(source.position(note.time + 0.000001, lane.id)).toBeCloseTo(note.step, 4);
      });
      source.reset(); expect(source.position(100, lane.id)).toBe(-1);
    });
  }
  test(`${variant} rate saves migrate safely and invalid rates preserve data`, () => {
    const score = compositionFixture(variant), before = structuredClone(score.state);
    const legacy = { ...before, lanes: before.lanes.map(({ rate, ...lane }) => { expect(rate).toBe(1); return lane; }) };
    expect(parseComposition(legacy)).toEqual(before);
    for (const rate of [0, 0.75, 3, NaN]) {
      expect(() => score.setRate(rate)).toThrow('Rate'); expect(score.state).toEqual(before);
      expect(() => parseComposition({ ...before, lanes: [{ ...before.lanes[0], rate }] })).toThrow('lane rate');
    }
    score.setRate(1.5); expect(parseComposition(JSON.parse(JSON.stringify(score.state)))).toEqual(score.state);
    expect(score.state.lanes.filter((lane) => lane.id !== score.selected.id)).toEqual(before.lanes.filter((lane) => lane.id !== score.selected.id));
  });
}
test('triplet and double-rate swing stay ordered inside the shared tick, without drifting across phrases', () => {
  for (const rate of [1.5, 2] as const) {
    const score = compositionFixture(); score.setRate(rate); score.setForm('broken'); score.selected.notes.fill(2);
    const source = new ScorePlayback(score), heard: number[] = [];
    for (let tick = 0; tick < COMPOSE.steps * 4; tick++) {
      const notes = source.schedule(tick * TICK, tick);
      expect(notes.map((note) => note.delay)).toEqual(notes.map((note) => note.delay).sort((a, b) => (a ?? 0) - (b ?? 0)));
      notes.filter((note) => note.lane === 'melody').forEach((note) => heard.push(tick * TICK + (note.delay ?? 0)));
    }
    heard.forEach((time, index) => expect(time).toBeCloseTo((index + (index % 2 ? 0.28 : 0)) * TICK / rate, 9));
    expect(laneTicks(COMPOSE.steps * 100, rate)[0].offset).toBe(0);
  }
});
test('orb profiles use independent lane phases beyond the master loop and after reordering', () => {
  const score = compositionFixture('custom-polyphony'), source = new ScorePlayback(score), visual = new MusicVisual(score, source);
  score.state.lanes.forEach((lane, index) => { score.select(lane.id); score.setRate(RATES[index % RATES.length].value); });
  source.schedule(0, 0);
  for (const time of [TICK * 25, TICK * 49]) {
    score.state.lanes.reverse(); visual.invalidate(); visual.update(time, 0.01, SILENCE);
    score.state.lanes.forEach((lane, index) => expect(visual.uniforms.uMusicPositions.value[index]).toBeCloseTo((time / TICK * lane.rate % COMPOSE.steps) / COMPOSE.steps));
  }
  visual.dispose();
});
test('the common playback clock stays unwrapped and independent of the selected lane rate', () => {
  const score = compositionFixture(), source = new ScorePlayback(score), origin = 3;
  expect(source.elapsed(origin)).toBe(-1); source.schedule(origin, 0);
  for (const { value } of RATES) {
    score.setRate(value); const time = origin + 49 * TICK;
    expect(source.elapsed(time)).toBeCloseTo(49); expect(source.position(time, score.selected.id)).toBeCloseTo(49 * value % COMPOSE.steps);
  }
  source.reset(); expect(source.elapsed(100)).toBe(-1);
});
