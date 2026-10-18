import { MUSIC } from '../config';
import { frequency } from '../score';
import type { VoiceShape } from './sequence';
import { instrumentFor } from './instruments';
import { voiceEnvelope } from './envelope';
import type { Partial } from './instruments';

export class Voices {
  private voices: { end: number; cancelled: boolean }[] = [];
  constructor(private context: BaseAudioContext, private bus: AudioNode, private capacity: () => number = () => MUSIC.maxVoices, private tuning = () => 1) {}

  pluck(midi: number, time: number, velocity: number, depth: number, shape?: VoiceShape) {
    this.voices = this.voices.filter((voice) => voice.end > time && !voice.cancelled);
    if (this.voices.length >= this.capacity()) return false;
    const gain = this.context.createGain(), filter = this.context.createBiquadFilter();
    const instrument = instrumentFor(shape?.instrument ?? 'pluck');
    const { duration, attack, hold } = voiceEnvelope(shape), end = time + duration;
    const peak = MUSIC.pluckGain * instrument.gain * Math.max(MUSIC.pluckMinimum, velocity);
    gain.gain.setValueAtTime(MUSIC.floor, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    if (hold > 0) gain.gain.setValueAtTime(peak, time + attack + hold);
    gain.gain.exponentialRampToValueAtTime(MUSIC.floor, end);
    filter.type = 'lowpass'; filter.frequency.value = shape?.cutoff ?? MUSIC.pluckCutoff + depth * MUSIC.pluckCutoffRange;
    filter.connect(gain).connect(this.bus);
    const sources = instrument.partials.map((partial) => this.oscillator(partial, midi, time, end, filter));
    sources[sources.length - 1].addEventListener('ended', () => { filter.disconnect(); gain.disconnect(); }, { once: true });
    const voice = { end, cancelled: false }; this.voices.push(voice);
    return (release = 0) => {
      voice.cancelled = true;
      if (release > 0) {
        gain.gain.cancelAndHoldAtTime(this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(MUSIC.floor, this.context.currentTime + release);
      }
      sources.forEach((source) => source.stop(this.context.currentTime + release));
    };
  }

  private oscillator(partial: Partial, midi: number, start: number, end: number, bus: AudioNode) {
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = partial.type; oscillator.frequency.value = frequency(midi) * this.tuning() * partial.ratio;
    oscillator.detune.value = (Math.random() * 2 - 1) * MUSIC.detuneCents;
    gain.gain.setValueAtTime(partial.gain, start);
    if (partial.fade !== null) gain.gain.exponentialRampToValueAtTime(MUSIC.floor, start + (end - start) * partial.fade);
    oscillator.connect(gain).connect(bus);
    oscillator.start(start); oscillator.stop(end);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    return oscillator;
  }
}
