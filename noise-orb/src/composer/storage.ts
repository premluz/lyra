import { COMPOSE, LANE_DEFINITIONS, isRole } from './config';
import { createComposition } from './model';
import type { Composition, Lane } from './model';
import { isInstrument } from '../audio/instruments';
import { createLane, SUSTAIN_RANGES, isContinuous, restoreMelodic } from './lanes';
import { isTuning } from './tuning';
import { SUSTAIN } from '../audio/sustain-config';
import { MUSIC } from '../config';
import { orderedPitches } from './rhythm';
import { isForm } from './composition-config';
import { isRate } from './pace';

export function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function text(value: unknown, limit: number, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`Saved score has an invalid ${name}.`);
  return value;
}
function parameter(value: unknown, name: string, low = 0, high = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) throw new Error(`Saved score has an invalid ${name}.`);
  return value;
}
function legacy(value: Record<string, unknown>, key: string, initial: unknown) { return Object.hasOwn(value, key) ? value[key] : initial; }
function pitch(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < COMPOSE.pitchMin || value > COMPOSE.pitchMax) throw new Error('Saved score has an invalid note.');
  return value;
}
function motif(value: unknown) {
  if (!Array.isArray(value) || value.length > COMPOSE.maxDensity) throw new Error('Saved score has an invalid pitch contour.');
  return value.map((note: unknown) => pitch(note));
}
function parseLane(value: unknown): Lane {
  if (!record(value) || typeof value.enabled !== 'boolean' || !Array.isArray(value.notes)) throw new Error('Saved score has an invalid lane.');
  const id = text(value.id, COMPOSE.idLength, 'lane ID');
  const starterRole = LANE_DEFINITIONS.find((definition) => definition.id === id)?.id;
  const role = legacy(value, 'role', starterRole);
  if (!isRole(role)) throw new Error('Saved score has an invalid sound role.');
  const defaults = createLane(id, role), name = text(legacy(value, 'name', defaults.name), COMPOSE.nameLength, 'sound name');
  if (value.notes.length !== COMPOSE.steps && value.notes.length !== COMPOSE.maxDensity) throw new Error('Saved score has a different loop length.');
  // Scores saved before the instrument palette used the original pluck for every lane.
  const instrument = legacy(value, 'instrument', defaults.instrument);
  if (!isInstrument(instrument)) throw new Error('Saved score has an invalid sound instrument.');
  const form = legacy(value, 'form', null);
  if (form !== null && !isForm(form)) throw new Error('Saved score has an invalid wave composition style.');
  if (role === 'binaural' && instrument !== 'sine') throw new Error('Saved binaural layers require pure sine tones.');
  const notes = value.notes.map((note: unknown) => note === null ? null : pitch(note));
  const lane: Lane = { ...defaults, id, role, name, enabled: value.enabled, instrument, notes, form, level: parameter(value.level, 'level'), tone: parameter(value.tone, 'tone'),
    length: parameter(value.length, 'length'), lift: parameter(value.lift, 'lift') };
  if (Object.hasOwn(value, 'gates')) {
    if (!Array.isArray(value.gates) || value.gates.length !== notes.length) throw new Error('Saved note durations must match their wave.');
    lane.gates = value.gates.map((gate: unknown) => parameter(gate, 'note duration', 0, COMPOSE.maxGate));
  }
  lane.pitch = parameter(legacy(value, 'pitch', defaults.pitch), 'pitch', ...SUSTAIN_RANGES.pitch);
  if (!Number.isInteger(lane.pitch)) throw new Error('Saved score has an invalid held pitch.');
  lane.attack = parameter(legacy(value, 'attack', defaults.attack), 'attack', ...SUSTAIN_RANGES.attack);
  lane.breath = parameter(legacy(value, 'breath', defaults.breath), 'breath', ...SUSTAIN_RANGES.breath);
  lane.movement = parameter(legacy(value, 'movement', defaults.movement), 'movement');
  lane.carrier = parameter(legacy(value, 'carrier', defaults.carrier), 'carrier', ...SUSTAIN_RANGES.carrier);
  lane.beat = parameter(legacy(value, 'beat', defaults.beat), 'beat', ...SUSTAIN_RANGES.beat);
  lane.phase = parameter(legacy(value, 'phase', notes.findIndex((note) => note !== null) < 0 ? defaults.phase : notes.findIndex((note) => note !== null)), 'offset', 0, notes.length - 1);
  if (!Number.isInteger(lane.phase)) throw new Error('Saved score has an invalid wave offset.');
  lane.motif = motif(legacy(value, 'motif', orderedPitches(lane)));
  const rate = legacy(value, 'rate', defaults.rate);
  if (!isRate(rate)) throw new Error('Saved score has an invalid lane rate.');
  lane.rate = rate;
  return lane;
}
export function parseComposition(value: unknown): Composition {
  if (!record(value) || value.version !== 1 || typeof value.selected !== 'string' || !Array.isArray(value.lanes)) throw new Error('Saved score format is invalid.');
  const lanes = value.lanes.map((lane: unknown) => parseLane(lane));
  if (!lanes.length || lanes.length > COMPOSE.maxLanes || new Set(lanes.map((lane) => lane.id)).size !== lanes.length) throw new Error('Each sound lane must occur once, within the lane limit.');
  if (!lanes.some((lane) => lane.id === value.selected)) throw new Error('Saved score is missing its selected lane.');
  const tuning = legacy(value, 'tuning', 'standard');
  if (!isTuning(tuning)) throw new Error('Saved score has an invalid tuning.');
  const ambientTools = legacy(value, 'ambientTools', false);
  const form = legacy(value, 'form', 'loop');
  if (!isForm(form)) throw new Error('Saved score has an invalid composition style.');
  if (typeof ambientTools !== 'boolean') throw new Error('Saved score has an invalid ambient tools switch.');
  const state: Composition = { version: 1, selected: value.selected, lanes, tuning, ambientTools, form,
    spaceSeconds: parameter(legacy(value, 'spaceSeconds', MUSIC.reverbSeconds), 'reverb length', SUSTAIN.space.min, SUSTAIN.space.max),
    wet: parameter(legacy(value, 'wet', MUSIC.reverbWet), 'reverb mix'),
    fadeSeconds: parameter(legacy(value, 'fadeSeconds', SUSTAIN.fadeOut.initial), 'fade duration', SUSTAIN.fadeOut.min, SUSTAIN.fadeOut.max) };
  // Earlier ambient arrangements predate the opt-in switch; reopen them in the melodic workspace.
  if (!Object.hasOwn(value, 'ambientTools') && lanes.some((lane) => lane.enabled && isContinuous(lane))) restoreMelodic(state);
  return state;
}
export function loadComposition(storage: Pick<Storage, 'getItem'>, key: string = COMPOSE.storageKey, initial = createComposition) {
  const saved = storage.getItem(key);
  return saved === null ? initial() : parseComposition(JSON.parse(saved));
}
