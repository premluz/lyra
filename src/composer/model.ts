import { MUSIC, clamp } from '../config';
import { COMPOSE, LANE_DEFINITIONS } from './config';
import type { KnobKey, LaneId, LaneRole } from './config';
import { randomiseLanes, randomiseForm } from './randomise';
import { formFor } from './composition-config';
import type { FormId } from './composition-config';
import type { InstrumentId } from '../audio/instruments';
import { createLane, defaultInstrument, SUSTAIN_RANGES, isContinuous, restoreMelodic } from './lanes';
import type { SustainKey } from './lanes';
import type { Lane } from './lanes';
import { SUSTAIN } from '../audio/sustain-config';
import type { Tuning } from './tuning';
import { addReference, hasReference } from './reference';
import { redistribute, wrapStep, orderedPitches, motifFor } from './rhythm';
import { isRate } from './pace';
import { laneForm } from './composition';
export type { Lane } from './lanes';

export interface Composition {
  version: 1; selected: LaneId; lanes: Lane[]; tuning: Tuning;
  spaceSeconds: number; wet: number; fadeSeconds: number; ambientTools: boolean;
  form: FormId;
}
export type CompositionGenerator = (state: Readonly<Composition>, random: () => number) => Pick<Composition, 'lanes' | 'form'>;
export const liftOf = (lane: Lane) => Math.round((lane.lift - 0.5) * COMPOSE.liftSteps * 2);
export const pitchFor = (lane: Lane, pitch: number) => clamp(pitch + liftOf(lane), COMPOSE.pitchMin, COMPOSE.pitchMax);
export function createComposition(): Composition {
  const lanes = LANE_DEFINITIONS.map((definition) => createLane(definition.id, definition.id));
  MUSIC.arpeggio.forEach((note, i) => { lanes[0].notes[i * MUSIC.idleEvery] = note; });
  lanes[0].motif = [...MUSIC.arpeggio];
  return { version: 1, selected: 'melody', lanes, tuning: 'standard', spaceSeconds: MUSIC.reverbSeconds, wet: MUSIC.reverbWet, fadeSeconds: SUSTAIN.fadeOut.initial, ambientTools: false, form: 'loop' };
}
export class Score {
  private previousRandomise: Composition | null = null;
  private undoKind: 'randomise' | '528 arrangement' = 'randomise';
  private removed: { lane: Lane; index: number } | null = null;
  constructor(readonly state: Composition = createComposition(), private changed?: () => void, private generator?: CompositionGenerator) {}
  get selected() { return this.lane(this.state.selected); }
  get activeTuning() { return this.state.ambientTools ? this.state.tuning : 'standard'; }
  get canUndoRandomise() { return this.removed ? this.state.lanes.length < COMPOSE.maxLanes : this.previousRandomise !== null; }
  get undoDescription() { return this.removed ? 'remove wave' : this.undoKind; }
  get canRemoveLane() { return this.state.lanes.length > COMPOSE.minLanes; }
  get canAddReference() { return hasReference(this.state) || this.state.lanes.length + COMPOSE.referenceLayers <= COMPOSE.maxLanes; }
  addLane(role: LaneRole = 'melody') {
    if (this.state.lanes.length >= COMPOSE.maxLanes) throw new Error(`The score supports up to ${COMPOSE.maxLanes} sound lanes.`);
    let number = this.state.lanes.length + 1;
    while (this.state.lanes.some((lane) => lane.id === `sound-${number}`) || this.removed?.lane.id === `sound-${number}`) number++;
    const lane = createLane(`sound-${number}`, role, `Sound ${number}`);
    lane.phase = this.state.lanes.length * COMPOSE.phaseSpacing % COMPOSE.steps;
    this.state.lanes.push(lane); this.state.selected = lane.id; this.changed?.(); return lane;
  }
  removeLane(id: LaneId) {
    if (!this.canRemoveLane) throw new Error('Keep at least one sound wave in the score.');
    const lane = this.lane(id), index = this.state.lanes.indexOf(lane);
    this.removed = { lane: structuredClone(lane), index }; this.previousRandomise = null;
    this.state.lanes.splice(index, 1);
    if (this.state.selected === id) this.state.selected = this.state.lanes[Math.min(index, this.state.lanes.length - 1)].id;
    this.changed?.();
  }
  setAmbientTools(enabled: boolean) {
    this.state.ambientTools = enabled;
    if (!enabled) restoreMelodic(this.state);
    this.changed?.();
  }
  addReference() {
    if (!this.canAddReference) throw new Error('The 528 arrangement needs five free sound lanes.');
    this.previousRandomise = structuredClone(this.state);
    this.removed = null;
    this.undoKind = '528 arrangement';
    Object.assign(this.state, addReference(this.state)); this.state.ambientTools = true; this.changed?.();
  }
  randomise(random: () => number = Math.random) {
    this.applyGeneration(this.generator ? this.generator(this.state, random) : this.randomComposition(random));
  }
  applyGeneration({ lanes, form }: Pick<Composition, 'lanes' | 'form'>) {
    this.previousRandomise = structuredClone(this.state); this.state.lanes = lanes; this.state.form = form;
    this.removed = null;
    this.undoKind = 'randomise';
    this.changed?.();
  }
  private randomComposition(random: () => number) {
    const eligible = this.state.lanes.filter((lane) => this.state.ambientTools || !isContinuous(lane));
    const form = randomiseForm(laneForm(this.selected, this.state.form), random), generated = randomiseLanes(eligible, random, form);
    const lanes = this.state.lanes.map((lane) => {
      const next = generated.find((next) => next.id === lane.id);
      return next && !isContinuous(next) ? { ...next, form: null } : next ?? lane;
    });
    return { lanes, form };
  }
  undoRandomise() {
    if (this.removed) {
      if (this.state.lanes.length >= COMPOSE.maxLanes) throw new Error('Make room for the removed wave before restoring it.');
      this.state.lanes.splice(this.removed.index, 0, this.removed.lane);
      if (!isContinuous(this.removed.lane) || this.state.ambientTools) this.state.selected = this.removed.lane.id;
      this.removed = null; this.changed?.(); return;
    }
    if (!this.previousRandomise) return;
    Object.assign(this.state, this.previousRandomise);
    this.previousRandomise = null; this.changed?.();
  }
  lane(id: LaneId) {
    const lane = this.state.lanes.find((candidate) => candidate.id === id);
    if (!lane) throw new Error(`The score is missing its ${id} lane.`);
    return lane;
  }
  select(id: LaneId) { this.lane(id); this.state.selected = id; this.changed?.(); }
  toggleLane(id: LaneId = this.state.selected) { const lane = this.lane(id); lane.enabled = !lane.enabled; this.changed?.(); }
  setInstrument(instrument: InstrumentId) {
    if (this.selected.role === 'binaural' && instrument !== 'sine') throw new Error('Binaural layers require pure sine tones.');
    this.selected.instrument = instrument; this.changed?.();
  }
  setRole(role: LaneRole) {
    this.selected.role = role;
    if (role === 'binaural' || this.selected.instrument === 'sine') this.selected.instrument = defaultInstrument(role);
    this.changed?.();
  }
  rename(name: string) {
    if (!name.trim() || name.length > COMPOSE.nameLength) throw new Error('Sound name must contain one to forty characters.');
    this.selected.name = name.trim(); this.changed?.();
  }
  setTuning(tuning: Tuning) { this.state.tuning = tuning; this.changed?.(); }
  setForm(form: FormId) { formFor(form); this.state.form = form; this.changed?.(); }
  setLaneForm(form: FormId) {
    formFor(form);
    if (isContinuous(this.selected)) throw new Error('Composition styles apply to note waves.');
    this.selected.form = form; this.changed?.();
  }
  setFade(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < SUSTAIN.fadeOut.min || seconds > SUSTAIN.fadeOut.max) throw new Error('Fade duration must be between sixty and 120 seconds.');
    this.state.fadeSeconds = seconds; this.changed?.();
  }
  setSpace(seconds: number, wet: number) {
    if (!Number.isFinite(seconds) || seconds < SUSTAIN.space.min || seconds > SUSTAIN.space.max || !Number.isFinite(wet) || wet < 0 || wet > 1) throw new Error('Invalid ambient reverb settings.');
    this.state.spaceSeconds = seconds; this.state.wet = wet; this.changed?.();
  }
  setSustain(key: SustainKey, value: number) {
    const [min, max] = SUSTAIN_RANGES[key];
    if (!Number.isFinite(value) || value < min || value > max || (key === 'pitch' && !Number.isInteger(value))) throw new Error(`Invalid sustained ${key}.`);
    this.selected[key] = value; this.changed?.();
  }
  shiftLane(id: LaneId, steps: number) {
    if (!Number.isInteger(steps)) throw new Error('Wave shift must be a whole number of steps.');
    const lane = this.lane(id), count = lane.notes.length, offset = ((steps % count) + count) % count;
    if (!offset) return;
    const notes = lane.notes;
    lane.notes = notes.map((_, step) => notes[(step - offset + count) % count]);
    if (lane.gates) { const gates = lane.gates; lane.gates = gates.map((_, step) => gates[(step - offset + count) % count]); }
    lane.phase = wrapStep(lane.phase + steps, count);
    this.changed?.();
  }
  setNote(step: number, pitch: number | null) {
    if (!Number.isInteger(step) || step < 0 || step >= this.selected.notes.length) throw new Error(`Invalid score step ${step}.`);
    if (pitch !== null && !Number.isFinite(pitch)) throw new Error('Note pitch must be finite.');
    if (pitch !== null && this.selected.notes.every((note) => note === null)) this.selected.phase = step;
    this.selected.notes[step] = pitch === null ? null : Math.round(clamp(pitch, COMPOSE.pitchMin, COMPOSE.pitchMax));
    if (pitch === null && this.selected.gates) this.selected.gates[step] = 0;
    if (this.selected.notes.some((note) => note !== null)) this.selected.motif = orderedPitches(this.selected);
    this.changed?.();
  }
  setDensity(count: number) {
    if (isContinuous(this.selected)) throw new Error('Density applies to melodic waves.');
    const notes = redistribute(this.selected, count);
    delete this.selected.gates;
    this.selected.phase = wrapStep(Math.round(this.selected.phase * notes.length / this.selected.notes.length), notes.length);
    this.selected.motif = [...motifFor(this.selected)]; this.selected.notes = notes; this.changed?.();
  }
  setRate(rate: number) {
    if (isContinuous(this.selected) || !isRate(rate)) throw new Error('Rate must be a supported musical ratio on a note lane.');
    this.selected.rate = rate; this.changed?.();
  }
  setKnob(key: KnobKey, value: number) {
    if (!Number.isFinite(value)) throw new Error(`Invalid ${key} value.`);
    this.selected[key] = clamp(value); this.changed?.();
  }
}
