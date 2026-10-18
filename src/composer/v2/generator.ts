import { clamp } from '../../config';
import type { InstrumentId } from '../../audio/instruments';
import { COMPOSE } from '../config';
import { createComposition } from '../model';
import type { Composition, CompositionGenerator } from '../model';
import { isContinuous } from '../lanes';
import type { Lane } from '../lanes';
import { orderedPitches } from '../rhythm';
import { integer } from '../randomise';
import type { Range } from '../randomise-config';
import { NORMAL_RATE } from '../pace';
import { V2 } from './config';
import type { Arrangement } from './config';
import { choose, v2Hook } from './hook';
import { v2Response } from './harmony';

function control(range: Range, random: () => number) {
  return integer([Math.round(range[0] * V2.controlResolution), Math.round(range[1] * V2.controlResolution)], random) / V2.controlResolution;
}
function instrument(palette: readonly InstrumentId[], used: Set<InstrumentId>, random: () => number) {
  const fresh = palette.filter(id => !used.has(id));
  const result = choose(fresh.length ? fresh : palette, random); used.add(result); return result;
}
function arrange(state: Readonly<Composition>, lead: Lane, hook: (number | null)[], profile: Arrangement, random: () => number, lockedRates = false) {
  const used = new Set<InstrumentId>(), peers = state.lanes.filter(lane => !isContinuous(lane) && lane.id !== lead.id).length;
  const lanes = state.lanes.map(lane => {
    if (isContinuous(lane)) return structuredClone(lane);
    const primary = lane.id === lead.id, bass = !primary && lane.role === 'undertow';
    const rate = primary || lockedRates ? NORMAL_RATE : choose(bass ? V2.bassRates : V2.answerRates, random);
    const notes = primary ? [...hook] : v2Response(lane, hook, rate, integer(bass ? profile.bassCount : profile.answerCount, random), random);
    const phase = notes.findIndex(pitch => pitch !== null);
    const decay = control(primary ? V2.leadDecay : bass ? V2.bassDecay : V2.answerDecay, random);
    const next: Lane = { ...lane, notes, phase, motif: orderedPitches({ ...lane, notes, phase }), rate, enabled: true, form: 'loop',
      instrument: instrument(primary ? profile.leads : bass ? V2.bassInstruments : V2.answerInstruments, used, random),
      level: control(primary ? V2.leadLevel : bass ? V2.bassLevel : V2.answerLevel, random) / (primary ? 1 : Math.sqrt(Math.max(1, peers / V2.cycleLoops))),
      tone: control(primary ? V2.leadTone : bass ? V2.bassTone : V2.answerTone, random),
      length: clamp((decay - COMPOSE.decayMin) / COMPOSE.decayRange), lift: V2.neutralLift };
    delete next.gates; return next;
  });
  return { lanes, form: 'loop' as const };
}
export function arrangeHook(state: Readonly<Composition>, lead: Lane, hook: (number | null)[], random: () => number = Math.random) {
  return arrange(state, lead, hook, choose(V2.arrangements, random), random, true);
}
export const randomiseV2: CompositionGenerator = (state, random) => {
  const lead = state.lanes.find(lane => lane.role === 'melody') ?? state.lanes.find(lane => !isContinuous(lane));
  if (!lead) throw new Error('Advanced V2 needs at least one note wave to generate a melodic tune.');
  const profile = choose(V2.arrangements, random);
  return arrange(state, lead, v2Hook(lead.notes, profile, random), profile, random);
};
export function createV2Composition(): Composition {
  const state = createComposition(), lead = state.lanes[0];
  return { ...state, ...arrange(state, lead, lead.notes, V2.arrangements[0], () => 0) };
}
