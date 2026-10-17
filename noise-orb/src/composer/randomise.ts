import type { Lane } from './model';
import { RANDOMISE } from './randomise-config';
import type { Range } from './randomise-config';
import { INSTRUMENTS, PAD_INSTRUMENTS } from '../audio/instruments';
import type { InstrumentId } from '../audio/instruments';
import { isContinuous } from './lanes';
import { SUSTAIN } from '../audio/sustain-config';
import { orderedPitches } from './rhythm';
import { FORMS } from './composition-config';
import type { FormId } from './composition-config';
import { hookNotes } from './hook';
import { chooseRate, supportingNotes } from './accompaniment';
import { ARRANGE } from './accompaniment-config';
import { NORMAL_RATE } from './pace';
import type { LaneRate } from './pace';

export function integer(range: Range, random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Tune generator requires random values between zero and one.');
  return range[0] + Math.floor(value * (range[1] - range[0] + 1));
}
function control(range: Range, previous: number, random: () => number) {
  const low = Math.round(range[0] * RANDOMISE.resolution), high = Math.round(range[1] * RANDOMISE.resolution);
  let value = integer([low, high], random);
  if (value === Math.round(previous * RANDOMISE.resolution)) value = value < high ? value + 1 : low;
  return value / RANDOMISE.resolution;
}
function wavyAccent(current: readonly Lane[], random: () => number) {
  const candidates = current.filter((lane) => lane.role === 'air');
  if (!candidates.length || integer([0, RANDOMISE.resolution - 1], random) >= RANDOMISE.wavyChance) return null;
  return candidates[integer([0, candidates.length - 1], random)].id;
}
export function chooseInstrument(previous: Lane, used: Set<InstrumentId>, accent: string | null, random: () => number) {
  const palette = previous.role === 'drone' ? PAD_INSTRUMENTS.filter((item) => item.id !== 'sine') : INSTRUMENTS.filter((item) =>
    (previous.role === 'undertow' ? RANDOMISE.bassInstruments : previous.id === accent ? RANDOMISE.wavyInstruments : RANDOMISE.melodicInstruments).some((id) => id === item.id));
  let choices = palette.filter((instrument) => instrument.id !== previous.instrument && !used.has(instrument.id));
  if (!choices.length) { used.clear(); choices = palette.filter((instrument) => instrument.id !== previous.instrument); }
  const instrument = choices[integer([0, choices.length - 1], random)].id; used.add(instrument); return instrument;
}
export function randomiseForm(previous: FormId, random: () => number): FormId {
  const choices = FORMS.filter((form) => form.id !== 'loop' && form.id !== previous);
  return choices[integer([0, choices.length - 1], random)].id;
}
export function randomiseLanes(current: readonly Lane[], random: () => number = Math.random, form: FormId = 'loop'): Lane[] {
  const used = new Set<InstrumentId>();
  const ambient = current.some((lane) => lane.enabled && isContinuous(lane));
  const accent = wavyAccent(current, random);
  const lead = current.find((lane) => lane.role === 'melody');
  const draw = (range: Range) => integer(range, random), rates = new Set<LaneRate>([NORMAL_RATE]);
  const hook = current.some((lane) => !isContinuous(lane)) ? hookNotes(RANDOMISE.profiles.melody, draw, form, lead?.notes) : [];
  return current.map((previous) => {
    const profile = { ...RANDOMISE.profiles[previous.role], count: previous.id === accent ? RANDOMISE.wavyCount : RANDOMISE.profiles[previous.role].count };
    if (previous.role === 'binaural') return { ...previous, level: control(profile.level, previous.level, random), carrier: integer([SUSTAIN.carrier.min, SUSTAIN.carrier.max], random) };
    const instrument = chooseInstrument(previous, used, accent, random);
    const primary = previous.id === lead?.id, rate = isContinuous(previous) ? previous.rate : primary ? NORMAL_RATE : chooseRate(previous, rates, draw);
    const pattern = isContinuous(previous) ? previous.notes : primary ? hook : supportingNotes(previous, hook, profile, rate, draw);
    const phase = isContinuous(previous) ? previous.phase : pattern.findIndex((pitch) => pitch !== null);
    const level = previous.id === accent ? RANDOMISE.wavyLevel : previous.role === 'melody' && !primary ? ARRANGE.supportingLevel : profile.level;
    const next: Lane = { ...previous, enabled: ambient && !isContinuous(previous) ? previous.enabled : true, instrument, rate,
      notes: pattern, phase, motif: isContinuous(previous) ? previous.motif : orderedPitches({ ...previous, notes: pattern, phase }),
      attack: isContinuous(previous) ? integer([SUSTAIN.attack.min, SUSTAIN.attack.max], random) : previous.attack,
      breath: isContinuous(previous) ? integer([SUSTAIN.breath.min, SUSTAIN.breath.max], random) : previous.breath,
      level: control(level, previous.level, random), tone: control(profile.tone, previous.tone, random),
      length: control(previous.id === accent ? RANDOMISE.wavyLength : profile.length, previous.length, random), lift: control(profile.lift, previous.lift, random) };
    if (!isContinuous(next)) delete next.gates;
    return next;
  });
}
