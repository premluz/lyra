import { setSeed, random } from '../../../src/engine/random';
import { Score } from '../composer/model';
import { newDrawing } from '../simple/score';
import { AURA, AURA_PALETTES } from './config';

export function auraWorld(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > AURA.seedMax) throw new Error('Aura needs a valid world seed.');
  setSeed(seed);
  const score = new Score(newDrawing(random));
  if (random() < AURA.extraVoiceChance) score.addLane('air');
  score.randomise(random);
  return { seed, composition: score.state, title: AURA.titles[seed % AURA.titles.length], palette: seed % AURA_PALETTES.length,
    phase: seed / AURA.seedMax * Math.PI * 2, form: Math.floor(seed / AURA.titles.length) % AURA_PALETTES.length };
}
export type AuraWorld = ReturnType<typeof auraWorld>;
export function loadAura(storage: Pick<Storage, 'getItem'>) {
  const raw = storage.getItem(AURA.storageKey);
  if (raw === null) return auraWorld(AURA.previewSeed);
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('seed' in value) || typeof value.seed !== 'number') throw new Error('Saved Aura world is invalid.');
  return auraWorld(value.seed);
}
export function nextAuraSeed(previous: number) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return seed % AURA.titles.length === previous % AURA.titles.length ? (seed + 1) >>> 0 : seed;
}
