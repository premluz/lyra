import { MUSIC, clamp } from '../config';
import { TICK } from '../score';
import type { SequenceNote } from '../audio/sequence';
import type { Lane } from './lanes';
import { COMPOSE } from './config';
import { COMPOSITION as C, formFor } from './composition-config';
import type { FormId, FormProfile } from './composition-config';

export function laneForm(lane: Lane, fallback: FormId): FormId { return lane.form ?? fallback; }

export function phraseAt(tick: number, form: FormId) {
  return form === 'loop' ? 0 : Math.floor(Math.max(0, tick) / COMPOSE.steps) % C.phrases;
}
export function foldPitch(pitch: number) {
  while (pitch < COMPOSE.pitchMin) pitch += C.octaveSteps;
  while (pitch > COMPOSE.pitchMax) pitch -= C.octaveSteps;
  return pitch;
}
function speaks(lane: Lane, step: number, phrase: number, form: FormProfile) {
  if (form.id !== 'conversation' || lane.role !== 'air') return true;
  const firstHalf = step < lane.notes.length * C.half, call = phrase % 2 === 0;
  return firstHalf !== call;
}
function melodyPitch(note: SequenceNote, lane: Lane, phrase: number, form: FormProfile) {
  // Keeping the hook fixed avoids octave-folding its cadence when the accompaniment changes harmony.
  const shift = lane.role === 'melody' ? 0 : form.harmony[phrase];
  return foldPitch(note.index + shift);
}
function noteDecay(note: SequenceNote, lane: Lane, form: FormProfile) {
  const last = lane.notes.reduce<number>((last, pitch, step) => pitch === null ? last : step, -1), ringing = lane.role === 'air' || note.step === last;
  const tail = lane.role === 'undertow' ? C.bassTail : ringing ? form.ring : form.release;
  const cap = lane.instrument === 'reed' || lane.instrument === 'strings' ? C.wavyDecayMax : C.decayMax;
  return clamp(note.shape.decay * tail, C.decayMin, cap);
}
export function composeNote(note: SequenceNote, lane: Lane, tick: number, id: FormId): SequenceNote[] {
  if (id === 'loop') return [note];
  const form = formFor(id), phrase = phraseAt(tick, id), step = note.step;
  if (!speaks(lane, step, phrase, form)) return [];
  const index = melodyPitch(note, lane, phrase, form);
  const accent = form.accents[step % form.accents.length] * form.dynamics[phrase];
  return [{ ...note, index, velocity: note.velocity * accent, delay: step % 2 ? form.swing * TICK * COMPOSE.steps / lane.notes.length / lane.rate : 0,
    point: { ...note.point, nx: index / COMPOSE.pitchMax, depth: index / COMPOSE.pitchMax, x: (index / COMPOSE.pitchMax * 2 - 1) * MUSIC.ambientWidth },
    shape: { ...note.shape, decay: noteDecay(note, lane, form), hold: note.shape.hold ?? 0 } }];
}
