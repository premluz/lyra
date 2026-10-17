import { MUSIC } from '../config';
import { instrumentFor, VOICE_ENVELOPE } from './instruments';
import type { VoiceShape } from './sequence';

export interface VoiceEnvelope { attack: number; hold: number; release: number; duration: number }
export function voiceEnvelope(shape?: VoiceShape): VoiceEnvelope {
  const instrument = instrumentFor(shape?.instrument ?? 'pluck');
  const base = (shape?.decay ?? MUSIC.decay) * instrument.duration, hold = shape?.hold ?? 0;
  const attack = Math.min(shape?.attack ?? instrument.attack, base * VOICE_ENVELOPE.attackFraction);
  const duration = hold > 0 ? attack + hold + base : base;
  return { attack, hold, release: duration - attack - hold, duration };
}
