import { MUSIC } from '../config';

export type InstrumentId = 'pluck' | 'felt' | 'marimba' | 'glass' | 'reed' | 'strings' | 'round-bass' | 'rubber-bass' | 'picked-bass' | 'muted-bass' | 'cloud' | 'choir' | 'tide' | 'sine';
export interface Partial {
  type: OscillatorType;
  ratio: number;
  gain: number;
  fade: number | null;
}
interface Instrument {
  id: InstrumentId;
  label: string;
  attack: number;
  gain: number;
  duration: number;
  partials: readonly Partial[];
}

// The lower fundamental anchors the arrangement; upper partials keep bass audible on small speakers.
export const BASS_INSTRUMENTS: readonly Instrument[] = [
  { id: 'round-bass', label: 'Round bass', attack: 0.014, gain: 1.2, duration: 1.1, partials: [
    { type: 'sine', ratio: 0.5, gain: 1, fade: null },
    { type: 'triangle', ratio: 1, gain: 0.35, fade: 0.6 },
  ] },
  { id: 'rubber-bass', label: 'Rubber bass', attack: 0.006, gain: 1.15, duration: 0.72, partials: [
    { type: 'triangle', ratio: 0.5, gain: 0.9, fade: null },
    { type: 'sine', ratio: 1.5, gain: 0.7, fade: 0.12 },
    { type: 'sine', ratio: 2.5, gain: 0.3, fade: 0.06 },
  ] },
  { id: 'picked-bass', label: 'Picked bass', attack: 0.003, gain: 1.15, duration: 0.85, partials: [
    { type: 'sawtooth', ratio: 0.5, gain: 0.45, fade: 0.3 },
    { type: 'sine', ratio: 0.5, gain: 0.65, fade: null },
    { type: 'triangle', ratio: 1, gain: 0.75, fade: null },
    { type: 'sine', ratio: 2, gain: 0.18, fade: 0.08 },
  ] },
  { id: 'muted-bass', label: 'Muted bass', attack: 0.009, gain: 1.3, duration: 0.38, partials: [
    { type: 'sine', ratio: 0.5, gain: 0.85, fade: null },
    { type: 'sine', ratio: 1, gain: 0.8, fade: 0.55 },
    { type: 'sine', ratio: 1.5, gain: 0.55, fade: 0.22 },
    { type: 'sine', ratio: 2, gain: 0.3, fade: 0.07 },
  ] },
];
// Partial ratios and independent decay give each voice its own acoustic character.
export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'pluck', label: 'Soft pluck', attack: MUSIC.attack, gain: 1, duration: 1, partials: [
    { type: 'sine', ratio: 1, gain: 1, fade: null },
    { type: 'triangle', ratio: 2, gain: MUSIC.overtone, fade: null },
  ] },
  { id: 'felt', label: 'Felt keys', attack: 0.018, gain: 1.05, duration: 1.25, partials: [
    { type: 'sine', ratio: 1, gain: 0.7, fade: null },
    { type: 'sine', ratio: 2, gain: 0.58, fade: 0.85 },
    { type: 'sine', ratio: 3, gain: 0.35, fade: 0.6 },
    { type: 'sine', ratio: 7, gain: 0.12, fade: 0.09 },
  ] },
  { id: 'marimba', label: 'Marimba', attack: 0.004, gain: 1.4, duration: 0.6, partials: [
    { type: 'sine', ratio: 1, gain: 0.95, fade: null },
    { type: 'sine', ratio: 4, gain: 0.6, fade: 0.18 },
    { type: 'sine', ratio: 10, gain: 0.22, fade: 0.08 },
  ] },
  { id: 'glass', label: 'Glass bell', attack: 0.006, gain: 1, duration: 1.5, partials: [
    { type: 'sine', ratio: 1, gain: 0.68, fade: null },
    { type: 'sine', ratio: 2.756, gain: 0.5, fade: 0.9 },
    { type: 'sine', ratio: 5.404, gain: 0.28, fade: 0.5 },
    { type: 'sine', ratio: 8.933, gain: 0.12, fade: 0.2 },
  ] },
  { id: 'reed', label: 'Warm reed', attack: 0.045, gain: 0.8, duration: 1, partials: [
    { type: 'square', ratio: 1, gain: 0.7, fade: null },
    { type: 'sine', ratio: 1, gain: 0.35, fade: null },
  ] },
  { id: 'strings', label: 'Bowed strings', attack: 0.24, gain: 1.2, duration: 1.6, partials: [
    { type: 'sawtooth', ratio: 1, gain: 0.7, fade: null },
    { type: 'triangle', ratio: 2, gain: 0.25, fade: null },
  ] },
  ...BASS_INSTRUMENTS,
];
export const PAD_INSTRUMENTS: readonly Instrument[] = [
  { id: 'cloud', label: 'Cloud pad', attack: 6, gain: 1, duration: 2, partials: [
    { type: 'sine', ratio: 1, gain: 0.7, fade: null }, { type: 'triangle', ratio: 2, gain: 0.25, fade: null },
    { type: 'sine', ratio: 4, gain: 0.12, fade: null },
  ] },
  { id: 'choir', label: 'Harmonic choir', attack: 8, gain: 0.85, duration: 2, partials: [
    { type: 'sine', ratio: 1, gain: 0.6, fade: null }, { type: 'sine', ratio: 3, gain: 0.35, fade: null },
    { type: 'sine', ratio: 5, gain: 0.22, fade: null }, { type: 'sine', ratio: 7, gain: 0.1, fade: null },
  ] },
  { id: 'tide', label: 'Ocean tide', attack: 10, gain: 0.8, duration: 2, partials: [
    { type: 'triangle', ratio: 1, gain: 0.65, fade: null }, { type: 'sawtooth', ratio: 2, gain: 0.2, fade: null },
    { type: 'sine', ratio: 0.5, gain: 0.3, fade: null },
  ] },
  { id: 'sine', label: 'Pure sine', attack: 6, gain: 1, duration: 1, partials: [{ type: 'sine', ratio: 1, gain: 1, fade: null }] },
];
export const ALL_INSTRUMENTS = [...INSTRUMENTS, ...PAD_INSTRUMENTS];
export const VOICE_ENVELOPE = { attackFraction: 0.4 } as const;
export function isInstrument(value: unknown): value is InstrumentId {
  return ALL_INSTRUMENTS.some((instrument) => instrument.id === value);
}
export function instrumentFor(id: InstrumentId) {
  const instrument = ALL_INSTRUMENTS.find((candidate) => candidate.id === id);
  if (!instrument) throw new Error(`Unknown sound instrument ${id}.`);
  return instrument;
}
