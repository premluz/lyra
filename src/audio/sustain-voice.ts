import { instrumentFor } from './instruments';
import { SUSTAIN } from './sustain-config';
import type { SustainedLane } from './sustain-config';

export interface ContinuousVoice { update(lane: SustainedLane, time: number): void; release(time: number): void }
export class SustainVoice implements ContinuousVoice {
  private filter: BiquadFilterNode;
  private gain: GainNode;
  private breathing: GainNode;
  private cutoffDepth: GainNode;
  private volumeDepth: GainNode;
  private lfos: OscillatorNode[] = [];
  private partials: { oscillator: OscillatorNode; gain: GainNode; ratio: number }[] = [];
  private lane: SustainedLane;

  constructor(context: BaseAudioContext, bus: AudioNode, lane: SustainedLane, time: number) {
    this.lane = lane; this.filter = context.createBiquadFilter(); this.filter.type = 'lowpass';
    this.gain = context.createGain(); this.gain.gain.value = 0; this.breathing = context.createGain();
    this.cutoffDepth = context.createGain(); this.volumeDepth = context.createGain();
    this.filter.connect(this.breathing).connect(this.gain).connect(bus);
    const instrument = instrumentFor(lane.instrument);
    this.partials = instrument.partials.map((partial) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = partial.type; oscillator.frequency.value = lane.frequency * partial.ratio;
      gain.gain.value = partial.gain * instrument.gain; oscillator.connect(gain).connect(this.filter); oscillator.start(time);
      return { oscillator, gain, ratio: partial.ratio };
    });
    this.addLfo(context, this.cutoffDepth, this.filter.frequency, time); this.addLfo(context, this.volumeDepth, this.breathing.gain, time);
    this.apply(lane, time, true);
  }
  private addLfo(context: BaseAudioContext, depth: GainNode, target: AudioParam, time: number) {
    const oscillator = context.createOscillator(); oscillator.type = 'sine';
    oscillator.connect(depth).connect(target); oscillator.start(time); this.lfos.push(oscillator);
  }
  update(lane: SustainedLane, time: number) { this.apply(lane, time, false); this.lane = lane; }
  private apply(lane: SustainedLane, time: number, initial: boolean) {
    if (initial || lane.level !== this.lane.level) {
      this.gain.gain.cancelAndHoldAtTime(time); this.gain.gain.linearRampToValueAtTime(lane.level * SUSTAIN.gain, time + lane.attack);
    }
    this.filter.frequency.setTargetAtTime(lane.cutoff, time, SUSTAIN.ease);
    this.cutoffDepth.gain.setTargetAtTime(lane.cutoff * lane.movement * SUSTAIN.filterDepth, time, SUSTAIN.ease);
    this.breathing.gain.setTargetAtTime(1 - lane.movement * SUSTAIN.amplitudeDepth, time, SUSTAIN.ease);
    this.volumeDepth.gain.setTargetAtTime(lane.movement * SUSTAIN.amplitudeDepth, time, SUSTAIN.ease);
    this.lfos[0].frequency.setTargetAtTime(SUSTAIN.filterRate / lane.breath, time, SUSTAIN.ease);
    this.lfos[1].frequency.setTargetAtTime(1 / lane.breath, time, SUSTAIN.ease);
    if (initial) {
      this.lfos[0].frequency.cancelScheduledValues(time); this.lfos[0].frequency.setValueAtTime(SUSTAIN.filterRate / lane.breath, time);
      this.lfos[1].frequency.cancelScheduledValues(time); this.lfos[1].frequency.setValueAtTime(1 / lane.breath, time);
    }
    this.partials.forEach(({ oscillator, ratio }) => oscillator.frequency.setTargetAtTime(lane.frequency * ratio, time, SUSTAIN.ease));
  }
  release(time: number) {
    const end = time + this.lane.release;
    this.gain.gain.cancelAndHoldAtTime(time); this.gain.gain.linearRampToValueAtTime(0, end);
    this.partials[0].oscillator.addEventListener('ended', () => {
      this.partials.forEach(({ oscillator, gain }) => { oscillator.disconnect(); gain.disconnect(); });
      this.lfos.forEach((oscillator) => oscillator.disconnect());
      this.filter.disconnect(); this.gain.disconnect(); this.breathing.disconnect(); this.cutoffDepth.disconnect(); this.volumeDepth.disconnect();
    }, { once: true });
    [...this.partials.map(({ oscillator }) => oscillator), ...this.lfos].forEach((oscillator) => oscillator.stop(end));
  }
}
