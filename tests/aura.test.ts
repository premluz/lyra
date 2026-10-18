import { expect, test } from 'vitest';
import { auraWorld, loadAura, nextAuraSeed } from '../src/aura/generation';
import { AuraInteraction } from '../src/aura/interaction';
import { AuraPlayback } from '../src/aura/playback';
import { AURA } from '../src/aura/config';
import { Score } from '../src/composer/model';
import { parseComposition } from '../src/composer/storage';
import { TICK } from '../src/score';

for (const seed of [0, 17, 95127, AURA.seedMax]) {
  test(`world ${seed} is repeatable, melodic and bounded`, () => {
    const world = auraWorld(seed);
    expect(auraWorld(seed)).toEqual(world); expect(parseComposition(world.composition)).toEqual(world.composition);
    expect(world.composition.lanes.length).toBeGreaterThanOrEqual(3); expect(world.composition.lanes.length).toBeLessThanOrEqual(4);
    expect(world.composition.lanes.every((lane) => lane.notes.some((note) => note !== null))).toBe(true);
    expect(new Set(world.composition.lanes.map((lane) => lane.instrument)).size).toBe(world.composition.lanes.length);
    expect(world.composition.lanes.some((lane) => lane.role === 'drone' || lane.role === 'binaural')).toBe(false);
  });
}
test('generation produces different arrangements and leaves unrelated storage alone', () => {
  const worlds = [0, 17, 95127, AURA.seedMax].map(auraWorld);
  expect(new Set(worlds.map((world) => JSON.stringify(world.composition))).size).toBe(worlds.length);
  expect(new Set(worlds.map((world) => world.composition.lanes.length))).toEqual(new Set([3, 4]));
  const reads: string[] = [], world = loadAura({ getItem: (key) => { reads.push(key); return JSON.stringify({ version: 1, seed: 17 }); } });
  expect(world).toEqual(auraWorld(17)); expect(reads).toEqual([AURA.storageKey]);
  expect(() => loadAura({ getItem: () => JSON.stringify({ version: 1, seed: -1 }) })).toThrow();
  for (const seed of [0, AURA.seedMax]) expect(auraWorld(nextAuraSeed(seed)).title).not.toBe(auraWorld(seed).title);
});
test('holding still progresses through distinct phases and release decays rather than snapping', () => {
  const state = new AuraInteraction(); state.press(); state.advance(AURA.gatherAt);
  expect(state.phase).toBe('gather'); state.advance(AURA.openAt); expect(state.phase).toBe('open');
  state.advance(AURA.bloomAt); expect(state.phase).toBe('bloom'); expect(state.bloom).toBeGreaterThan(0.8);
  const charge = state.charge; state.release(); state.advance(0.05);
  expect(state.phase).toBe('idle'); expect(state.charge).toBeLessThan(charge); expect(state.charge).toBeGreaterThan(charge / 2);
  state.advance(30); expect(state.charge).toBeLessThan(0.001);
});
for (const seed of [17, 95127]) {
  test(`pointer regions and holding affect the performed voices without rewriting world ${seed}`, () => {
    const world = auraWorld(seed), score = new Score(world.composition), original = structuredClone(score.state);
    const state = new AuraInteraction(), source = new AuraPlayback(score, state);
    state.move({ x: -1, y: -1, z: 2, nx: 0, depth: 1 }, 0, 1, 0.4); state.advance(10);
    const low = source.note('melody', 0);
    state.move({ x: 1, y: 1, z: 2, nx: 1, depth: 0 }, 1, 0, 0.4); state.press(); state.advance(6);
    const high = source.note('melody', 0);
    expect(high.shape.cutoff).toBeGreaterThan(low.shape.cutoff); expect(high.shape.decay).toBeGreaterThan(low.shape.decay);
    expect(score.state).toEqual(original); expect(source.continuous()).toMatchObject({ legacyBed: false, lanes: [] });
    const notes = Array.from({ length: 12 }, (_, tick) => source.schedule(tick * TICK, tick)).flat();
    const gestures = notes.filter((note) => note.lane === AURA.touchLane);
    expect(gestures.length).toBeGreaterThan(2); expect(gestures.every((note) => note.index >= 0 && note.index <= 15 && (note.delay ?? 0) === 0)).toBe(true);
    expect(source.voiceLimit()).toBe(AURA.voiceLimit);
  });
}
test('a cancelled press is silent; a long release leaves three quantized echoes and regeneration restarts the phrase', () => {
  const score = new Score(auraWorld(17).composition), state = new AuraInteraction(), source = new AuraPlayback(score, state);
  state.press(); state.release(true);
  expect(source.schedule(0, 0).filter((note) => note.lane === AURA.touchLane)).toEqual([]);
  state.press(); source.schedule(TICK, 1); state.advance(AURA.openAt + 1); state.release();
  const echoes = [2, 3, 4, 5].flatMap((tick) => source.schedule(tick * TICK, tick).filter((note) => note.lane === AURA.touchLane));
  expect(echoes).toHaveLength(AURA.releaseNotes.length);
  source.reset(); source.schedule(10, 84); expect(source.position(10)).toBe(0);
});
