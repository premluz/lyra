import { expect, test } from 'vitest';
import { Score, createComposition } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';
import { parseComposition } from '../src/composer/storage';
import { ScorePlayback } from '../src/composer/playback';
import { TICK } from '../src/score';

for (const variant of ['starter', 'irregular-wrapped-air']) {
  test(`density redistributes the ${variant} pitch contour with a stable phase and circular spacing`, () => {
    const score = new Score();
    if (variant === 'irregular-wrapped-air') { score.select('air'); score.setNote(19, 11); score.setNote(2, 3); score.setNote(7, 8); }
    const phase = score.selected.phase, others = structuredClone(score.state.lanes.filter((lane) => lane.id !== score.state.selected));
    const pitches = new Set(score.selected.notes.filter((pitch) => pitch !== null));
    for (const density of [1, 3, 8, 17, COMPOSE.steps]) {
      score.setDensity(density);
      expect(score.selected.notes.filter((pitch) => pitch !== null)).toHaveLength(density); expect(score.selected.phase).toBe(phase);
      expect(score.selected.notes[phase]).not.toBeNull();
      score.selected.notes.forEach((pitch) => { if (pitch !== null) expect(pitches.has(pitch)).toBe(true); });
      const positions = score.selected.notes.flatMap((pitch, step) => pitch === null ? [] : [step]);
      const gaps = positions.map((position, i) => (positions[(i + 1) % positions.length] - position + COMPOSE.steps) % COMPOSE.steps || COMPOSE.steps);
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    }
    expect(score.state.lanes.filter((lane) => lane.id !== score.state.selected)).toEqual(others);
    expect(parseComposition(score.state)).toEqual(score.state);
    score.setDensity(0); expect(score.selected.notes.every((pitch) => pitch === null)).toBe(true);
  });
}

test('density and offset create distinct, quantized note rates in independent waves', () => {
  const score = new Score(); score.setDensity(12); score.select('air'); score.setDensity(3); score.shiftLane('air', 3 - score.selected.phase);
  const source = new ScorePlayback(score), events = Array.from({ length: COMPOSE.steps }, (_, tick) => source.schedule(tick * TICK, tick)).flat();
  const melody = events.filter((event) => event.lane === 'melody'), air = events.filter((event) => event.lane === 'air');
  expect(melody).toHaveLength(12); expect(air.map((event) => event.step)).toEqual([3, 11, 19]);
  expect(air.every((note) => melody.every((other) => other.step !== note.step))).toBe(true);
  score.shiftLane('air', COMPOSE.steps); expect(score.selected.phase).toBe(3);
  score.setDensity(8); expect(score.selected.phase).toBe(3);
  const before = structuredClone(score.state); score.shiftLane('air', -7); score.shiftLane('air', 7); expect(score.state).toEqual(before);
});

for (const id of ['melody', 'air']) {
  test(`removes and restores ${id} without losing later edits or new waves`, () => {
    const score = new Score(); score.select(id); score.setDensity(5); const original = structuredClone(score.selected);
    score.removeLane(id); expect(score.state.lanes.some((lane) => lane.id === id)).toBe(false);
    score.setNote(1, 13); const edited = structuredClone(score.selected), added = score.addLane();
    score.undoRandomise(); expect(score.lane(id)).toEqual(original); expect(score.lane(edited.id)).toEqual(edited);
    expect(score.lane(added.id)).toEqual(added); expect(score.state.selected).toBe(id); expect(parseComposition(score.state)).toEqual(score.state);
  });
}

test('does not reuse a removed generated ID before Undo, and keeps the last wave valid', () => {
  const score = new Score(), first = score.addLane(); score.removeLane(first.id); const next = score.addLane();
  expect(next.id).not.toBe(first.id); score.undoRandomise(); expect(score.state.lanes).toHaveLength(5);
  while (score.canRemoveLane) score.removeLane(score.state.selected);
  const before = structuredClone(score.state); expect(() => score.removeLane(score.state.selected)).toThrow('at least one'); expect(score.state).toEqual(before);
});

for (const role of ['drone', 'binaural'] as const) {
  test(`restoring a removed ${role} keeps the melodic selection when Ambient tools are off`, () => {
    const score = new Score(), added = score.addLane(role); score.setAmbientTools(true); score.removeLane(added.id);
    score.setAmbientTools(false); const selection = score.state.selected; score.undoRandomise();
    expect(score.lane(added.id)).toEqual(added); expect(score.state.selected).toBe(selection);
    expect(new ScorePlayback(score).continuous().lanes).toEqual([]);
  });
}

test('ambient tools are opt-in and switching them off restores melodic playback without deleting the ambient configuration', () => {
  const score = new Score(), source = new ScorePlayback(score); expect(score.state.ambientTools).toBe(false);
  score.addReference(); const ambient = structuredClone(score.state.lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural'));
  score.setAmbientTools(false); expect(source.continuous()).toMatchObject({ lanes: [], legacyBed: false, spaceSeconds: 3, wet: 0.25 });
  expect(source.schedule(0, 0).map((note) => note.lane)).toContain('melody'); expect(source.tuning()).toBe(1);
  score.randomise(() => 0); expect(score.state.lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural')).toEqual(ambient);
  score.setAmbientTools(true); expect(source.continuous().lanes).toHaveLength(5);
  expect(parseComposition(score.state)).toEqual(score.state);
});

for (const reverse of [false, true]) {
  test(`migrates pre-density ${reverse ? 'reordered' : 'starter'} music without changing its notes`, () => {
    const state = createComposition(); if (reverse) { state.lanes.reverse(); state.selected = 'air'; new Score(state).setNote(21, 13); }
    const legacy = { ...state, lanes: state.lanes.map(({ phase, ...lane }) => { expect(Number.isInteger(phase)).toBe(true); return lane; }) };
    expect(parseComposition(legacy)).toEqual(state);
    expect(() => parseComposition({ ...state, ambientTools: 'yes' })).toThrow('ambient tools');
    expect(() => parseComposition({ ...state, lanes: [{ ...state.lanes[0], phase: 0.5 }] })).toThrow('offset');
  });
}

test('invalid density does not change notes or pitch and held layers have no density', () => {
  const score = new Score(), before = structuredClone(score.state);
  for (const count of [-1, COMPOSE.maxDensity + 1, 1.5, NaN]) { expect(() => score.setDensity(count)).toThrow('Density'); expect(score.state).toEqual(before); }
  score.addLane('drone'); expect(() => score.setDensity(4)).toThrow('melodic');
});

test('turning density down to zero and back up preserves the melody instead of flattening it to one note', () => {
  const score = new Score(), original = structuredClone(score.selected.motif);
  for (const density of [1, 0, 3, 12, 6]) score.setDensity(density);
  expect(score.selected.motif).toEqual(original);
  expect(score.selected.notes.filter((note) => note !== null)).toEqual(original);
  expect(parseComposition(score.state)).toEqual(score.state);
});

for (const reverse of [false, true]) {
  test(`older ${reverse ? 'reordered custom' : 'reference'} ambient projects reopen melodically while keeping held configurations`, () => {
    const score = new Score(); score.addReference();
    if (reverse) {
      score.state.lanes.reverse(); const foundation = score.state.lanes.find((lane) => lane.id === 'reference-root');
      if (!foundation) throw new Error('Reference fixture has no foundation.'); foundation.name = 'Custom foundation';
    }
    const { ambientTools, ...legacy } = score.state; expect(ambientTools).toBe(true);
    const migrated = parseComposition(legacy), source = new ScorePlayback(new Score(migrated));
    expect(migrated.ambientTools).toBe(false); expect(migrated.selected).toBe('melody');
    expect(source.continuous().lanes).toEqual([]); expect(source.schedule(0, 0).some((note) => note.lane === 'melody')).toBe(true);
    expect(migrated.lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural')).toEqual(score.state.lanes.filter((lane) => lane.role === 'drone' || lane.role === 'binaural'));
  });
}
