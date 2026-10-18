import { SUSTAIN } from './sustain-config';
import type { SustainedLane } from './sustain-config';
import type { ContinuousVoice } from './sustain-voice';

export class BinauralVoice implements ContinuousVoice {
  private merger: ChannelMergerNode;
  private gain: GainNode;
  private left: OscillatorNode;
  private right: OscillatorNode;
  private lane: SustainedLane;

  constructor(context: BaseAudioContext, dry: AudioNode, lane: SustainedLane, time: number) {
    this.lane = lane; this.merger = context.createChannelMerger(2); this.gain = context.createGain(); this.gain.gain.value = 0;
    this.left = context.createOscillator(); this.right = context.createOscillator();
    this.left.type = 'sine'; this.right.type = 'sine';
    this.left.frequency.value = lane.carrier; this.right.frequency.value = lane.carrier + lane.beat;
    this.left.connect(this.merger, 0, 0); this.right.connect(this.merger, 0, 1);
    this.merger.connect(this.gain).connect(dry); this.left.start(time); this.right.start(time);
    this.gain.gain.linearRampToValueAtTime(lane.level * SUSTAIN.binauralGain, time + lane.attack);
  }
  update(lane: SustainedLane, time: number) {
    if (lane.level !== this.lane.level) {
      this.gain.gain.cancelAndHoldAtTime(time); this.gain.gain.linearRampToValueAtTime(lane.level * SUSTAIN.binauralGain, time + lane.attack);
    }
    // Equal glide times preserve the requested L/R frequency difference during retuning.
    this.left.frequency.setTargetAtTime(lane.carrier, time, SUSTAIN.ease);
    this.right.frequency.setTargetAtTime(lane.carrier + lane.beat, time, SUSTAIN.ease);
    this.lane = lane;
  }
  release(time: number) {
    const end = time + this.lane.release;
    this.gain.gain.cancelAndHoldAtTime(time); this.gain.gain.linearRampToValueAtTime(0, end);
    this.left.stop(end); this.right.stop(end);
    this.left.addEventListener('ended', () => { this.left.disconnect(); this.right.disconnect(); this.merger.disconnect(); this.gain.disconnect(); }, { once: true });
  }
}
