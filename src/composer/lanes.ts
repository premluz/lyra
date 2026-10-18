import { MUSIC } from '../config';
import { SUSTAIN } from '../audio/sustain-config';
import type { InstrumentId } from '../audio/instruments';
import { COMPOSE, ROLES } from './config';
import type { LaneId, LaneRole } from './config';
import { NORMAL_RATE } from './pace';
import type { LaneRate } from './pace';
import type { FormId } from './composition-config';

export interface Lane {
  id: LaneId; name: string; role: LaneRole; enabled: boolean; notes: (number | null)[]; instrument: InstrumentId;
  level: number; tone: number; length: number; lift: number; pitch: number;
  attack: number; breath: number; movement: number; carrier: number; beat: number;
  phase: number; motif: number[]; rate: LaneRate; form: FormId | null; gates?: number[];
}
export function roleDefinition(role: LaneRole) {
  const result = ROLES.find((definition) => definition.id === role);
  if (!result) throw new Error(`Unknown sound role ${role}.`);
  return result;
}
export function isContinuous(lane: Lane) { return lane.role === 'drone' || lane.role === 'binaural'; }
export function isAudible(lane: Lane, ambientTools: boolean) { return lane.enabled && (!isContinuous(lane) || ambientTools); }
export function restoreMelodic(state: { lanes: Lane[]; selected: LaneId }) {
  const melodic = state.lanes.filter((lane) => !isContinuous(lane));
  if (!melodic.some((lane) => lane.enabled)) { const first = melodic.find((lane) => lane.notes.some((note) => note !== null)); if (first) first.enabled = true; }
  const selected = state.lanes.find((lane) => lane.id === state.selected);
  if (!selected) throw new Error('Cannot restore a score with a missing selected wave.');
  const focus = melodic.find((lane) => lane.enabled && lane.notes.some((note) => note !== null)) ?? melodic[0];
  if (isContinuous(selected) && focus) state.selected = focus.id;
}
export function defaultInstrument(role: LaneRole): InstrumentId {
  return role === 'binaural' ? 'sine' : role === 'drone' ? 'cloud' : 'pluck';
}
export const SUSTAIN_RANGES = { pitch: [COMPOSE.pitchMin, COMPOSE.pitchMax], attack: [SUSTAIN.attack.min, SUSTAIN.attack.max],
  breath: [SUSTAIN.breath.min, SUSTAIN.breath.max], movement: [0, 1], carrier: [SUSTAIN.carrier.min, SUSTAIN.carrier.max], beat: [SUSTAIN.beat.min, SUSTAIN.beat.max] } as const;
export type SustainKey = keyof typeof SUSTAIN_RANGES;
export function createLane(id: LaneId, role: LaneRole, name: string = roleDefinition(role).label): Lane {
  const definition = roleDefinition(role);
  return { id, name, role, enabled: true, instrument: defaultInstrument(role),
    notes: Array.from({ length: COMPOSE.steps }, () => null), motif: [], rate: NORMAL_RATE, form: null, level: definition.level, tone: definition.tone,
    length: (MUSIC.decay - COMPOSE.decayMin) / COMPOSE.decayRange, lift: 0.5, pitch: definition.base,
    attack: SUSTAIN.attack.initial, breath: SUSTAIN.breath.initial, movement: SUSTAIN.movement,
    carrier: SUSTAIN.carrier.initial, beat: SUSTAIN.beat.initial,
    phase: ROLES.findIndex((item) => item.id === role) * COMPOSE.phaseSpacing % COMPOSE.steps };
}
