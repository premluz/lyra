import { MUSIC, clamp } from '../config';

export const METER = { bassHz: 400, midHz: 2000, maxHz: 10000, gain: 18, floor: 0.00001 } as const;
export interface AudioFrame { level: number; bass: number; mid: number; treble: number }
export const SILENCE: Readonly<AudioFrame> = { level: 0, bass: 0, mid: 0, treble: 0 };

export function spectrumFrame(wave: Float32Array, spectrum: Float32Array, sampleRate: number): AudioFrame {
  const level = Math.sqrt(wave.reduce((sum, value) => sum + value * value, 0) / wave.length);
  if (level < METER.floor) return { ...SILENCE };
  const bands = [0, 0, 0], binHz = sampleRate / (spectrum.length * 2);
  spectrum.forEach((db, index) => {
    const hz = index * binHz;
    if (!index || hz > METER.maxHz) return;
    const band = hz < METER.bassHz ? 0 : hz < METER.midHz ? 1 : 2;
    bands[band] += 10 ** (db / 10);
  });
  const [bass, mid, treble] = bands.map((power) => clamp(Math.sqrt(power) * METER.gain));
  return { level, bass, mid, treble };
}

export class AudioMeter {
  private wave = new Float32Array(MUSIC.waveformSize);
  private spectrum = new Float32Array(MUSIC.waveformSize / 2);
  sample(analyser: AnalyserNode | null, sampleRate: number, silent: boolean): AudioFrame {
    if (!analyser || silent) return { ...SILENCE };
    analyser.getFloatTimeDomainData(this.wave); analyser.getFloatFrequencyData(this.spectrum);
    return spectrumFrame(this.wave, this.spectrum, sampleRate);
  }
}
