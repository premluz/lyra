import { createLane } from './lanes';
import type { Composition } from './model';
import { SUSTAIN } from '../audio/sustain-config';

const REFERENCE = [
  { id: 'reference-root', name: '528 foundation', role: 'drone', instrument: 'cloud', pitch: 10, level: 0.42, tone: 0.3, attack: 8, breath: 48 },
  { id: 'reference-fifth', name: 'Parallel fifth', role: 'drone', instrument: 'tide', pitch: 3, level: 0.3, tone: 0.22, attack: 10, breath: 57 },
  { id: 'reference-ninth', name: 'Floating ninth', role: 'drone', instrument: 'choir', pitch: 6, level: 0.24, tone: 0.45, attack: 6, breath: 37 },
  { id: 'reference-octave', name: 'Lower octave', role: 'drone', instrument: 'cloud', pitch: 5, level: 0.36, tone: 0.18, attack: 9, breath: 43 },
  { id: 'reference-binaural', name: '6 Hz stereo pair', role: 'binaural', instrument: 'sine', pitch: 0, level: 0.2, tone: 0.5, attack: 8, breath: 45 },
] as const;
export function hasReference(state: Composition) { return REFERENCE.every(({ id }) => state.lanes.some((lane) => lane.id === id)); }
export function addReference(state: Composition): Composition {
  const lanes = state.lanes.map((lane) => ({ ...lane, enabled: false }));
  for (const voice of REFERENCE) {
    const existing = lanes.find((lane) => lane.id === voice.id);
    if (existing) existing.enabled = true;
    else lanes.push({ ...createLane(voice.id, voice.role, voice.name), ...voice, length: 1, lift: 0.5 });
  }
  return { ...state, lanes, selected: REFERENCE[0].id, tuning: '528', spaceSeconds: SUSTAIN.space.initial, wet: SUSTAIN.space.wet };
}
