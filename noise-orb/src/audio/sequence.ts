import type { TouchPoint } from '../score';
import type { InstrumentId } from './instruments';
import type { SustainedFrame } from './sustain-config';

export interface VoiceShape { decay: number; cutoff: number; instrument?: InstrumentId; hold?: number; attack?: number }
export interface SequenceNote {
  lane: string;
  step: number;
  index: number;
  velocity: number;
  point: TouchPoint;
  shape: VoiceShape;
  delay?: number;
}
export interface SequenceSource {
  readonly authoredOnly?: boolean;
  schedule(time: number, tick: number): readonly SequenceNote[];
  reset(): void;
  continuous?(): SustainedFrame;
  midi?(index: number): number;
  tuning?(): number;
  voiceLimit?(): number;
}
