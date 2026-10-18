import { MUSIC } from '../config';
import { TICK } from '../score';
import { SUSTAIN } from './sustain-config';

function impulse(context: BaseAudioContext, seconds: number) {
  const buffer = context.createBuffer(2, context.sampleRate * seconds, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** MUSIC.impulseDecay;
  }
  return buffer;
}
function limiter(context: BaseAudioContext, input: AudioNode) {
  const compressor = context.createDynamicsCompressor(), ceiling = context.createWaveShaper();
  for (const key of ['threshold', 'knee', 'ratio', 'attack', 'release'] as const) compressor[key].value = MUSIC.compressor[key];
  ceiling.curve = Float32Array.from({ length: MUSIC.limiterResolution }, (_, i) => Math.tanh((i / (MUSIC.limiterResolution - 1) * 2 - 1)));
  input.connect(compressor).connect(ceiling);
  return ceiling;
}
export class AudioGraph {
  readonly notes: GainNode;
  readonly mix: GainNode;
  readonly master: GainNode;
  readonly analyser: AnalyserNode;
  readonly clean: GainNode;
  private convolver: ConvolverNode;
  private wet: GainNode;
  private dry: GainNode;
  private envelope: GainNode;
  private reverbSeconds = 0;
  private wetMix: number = MUSIC.reverbWet;

  constructor(readonly context: BaseAudioContext) {
    this.notes = context.createGain(); this.mix = context.createGain(); this.master = context.createGain();
    this.clean = context.createGain(); this.convolver = context.createConvolver(); this.wet = context.createGain(); this.dry = context.createGain();
    this.wet.gain.value = MUSIC.reverbWet; this.dry.gain.value = 1 - MUSIC.reverbWet; this.envelope = context.createGain();
    this.analyser = context.createAnalyser(); this.analyser.fftSize = MUSIC.waveformSize;
    this.master.gain.value = 0;
    this.notes.connect(this.mix);
    this.delay();
    const sum = context.createGain(); this.space().connect(sum); this.clean.connect(sum);
    limiter(context, sum).connect(this.envelope).connect(this.master).connect(this.analyser).connect(context.destination);
  }

  private delay() {
    const delay = this.context.createDelay(2), feedback = this.context.createGain();
    const filter = this.context.createBiquadFilter(), send = this.context.createGain();
    delay.delayTime.value = TICK * MUSIC.subdivisions * MUSIC.delayBeats;
    filter.type = 'lowpass'; filter.frequency.value = MUSIC.delayCutoff;
    feedback.gain.value = MUSIC.feedback; send.gain.value = MUSIC.delaySend;
    this.notes.connect(delay); delay.connect(filter).connect(feedback).connect(delay);
    delay.connect(send).connect(this.mix);
  }

  private space() {
    const output = this.context.createGain();
    this.configureSpace(MUSIC.reverbSeconds, MUSIC.reverbWet);
    this.mix.connect(this.dry).connect(output); this.mix.connect(this.convolver).connect(this.wet).connect(output);
    return output;
  }

  configureSpace(seconds: number, wet: number) {
    if (seconds !== this.reverbSeconds) { this.convolver.buffer = impulse(this.context, seconds); this.reverbSeconds = seconds; }
    if (wet !== this.wetMix) {
      this.wet.gain.setTargetAtTime(wet, this.context.currentTime, SUSTAIN.ease);
      this.dry.gain.setTargetAtTime(1 - wet, this.context.currentTime, SUSTAIN.ease); this.wetMix = wet;
    }
  }
  fadeOut(seconds: number) {
    const now = this.context.currentTime;
    this.envelope.gain.cancelAndHoldAtTime(now); this.envelope.gain.linearRampToValueAtTime(0, now + seconds);
    return now + seconds;
  }

  mute(muted: boolean) {
    this.master.gain.setTargetAtTime(muted ? 0 : MUSIC.output, this.context.currentTime, MUSIC.masterEase);
  }
}
