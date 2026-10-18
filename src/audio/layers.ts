import { MUSIC, clamp } from '../config';
import { frequency } from '../score';

export class Layers {
  private filter: BiquadFilterNode;
  private pad: GainNode;
  private chord: GainNode;
  private oscillators: OscillatorNode[] = [];
  private pitches: number[] = [];
  private output: GainNode;
  private enabled = true;

  constructor(private context: BaseAudioContext, bus: AudioNode, enabled = true) {
    this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass';
    this.filter.frequency.value = MUSIC.filterClosed;
    this.pad = context.createGain(); this.pad.gain.value = MUSIC.padGain;
    this.output = context.createGain(); this.output.gain.value = enabled ? 1 : 0; this.enabled = enabled;
    this.chord = context.createGain(); this.chord.gain.value = 0;
    this.pad.connect(this.filter); this.chord.connect(this.filter); this.filter.connect(this.output).connect(bus);
    this.add(MUSIC.root + MUSIC.padOctave, -MUSIC.padDetune, this.pad); this.add(MUSIC.root + MUSIC.padFifth, MUSIC.padDetune, this.pad);
    for (const interval of MUSIC.chordIntervals) this.add(MUSIC.root + interval, 0, this.chord);
  }
  enable(enabled: boolean) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.output.gain.setTargetAtTime(enabled ? 1 : 0, this.context.currentTime, MUSIC.layerEase);
  }
  presence(amount: number, held: boolean) {
    this.output.gain.setTargetAtTime(clamp(amount), this.context.currentTime, held ? MUSIC.layerEase : MUSIC.swellDecay);
    this.swell(amount, held);
  }
  retune(root: number, tuning: number) {
    this.oscillators.forEach((oscillator, index) => oscillator.frequency.setTargetAtTime(
      frequency(this.pitches[index] + root - MUSIC.root) * tuning, this.context.currentTime, MUSIC.layerEase));
  }

  private add(midi: number, detune: number, bus: AudioNode) {
    const oscillator = this.context.createOscillator(); oscillator.type = 'triangle';
    oscillator.frequency.value = frequency(midi); oscillator.detune.value = detune;
    oscillator.connect(bus); oscillator.start(); this.oscillators.push(oscillator); this.pitches.push(midi);
  }

  swell(amount: number, dragging: boolean) {
    const time = this.context.currentTime, target = clamp(amount);
    const ease = dragging ? MUSIC.layerEase : MUSIC.swellDecay;
    this.filter.frequency.setTargetAtTime(MUSIC.filterClosed + target * (MUSIC.filterOpen - MUSIC.filterClosed), time, ease);
    this.chord.gain.setTargetAtTime(dragging ? MUSIC.chordGain : 0, time, ease);
  }

  dispose() { for (const oscillator of this.oscillators) { oscillator.stop(); oscillator.disconnect(); } }
}
