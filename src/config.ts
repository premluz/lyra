export const MUSIC = {
  root: 50, intervals: [0, 2, 4, 7, 9], octaves: 3, bpm: 84, subdivisions: 2,
  lookahead: 0.1, timerMs: 25, startLead: 0.025, maxVoices: 6, maxLeap: 5,
  attack: 0.012, decay: 1.2, floor: 0.0001, pluckGain: 0.075, overtone: 0.24,
  detuneCents: 5, delayBeats: 0.75, feedback: 0.35, delayCutoff: 3000,
  reverbSeconds: 3, reverbWet: 0.25, output: 0.8,
  padGain: 0.023, chordGain: 0.017, filterClosed: 420, filterOpen: 2400,
  layerEase: 0.3, swellDecay: 0.65, idleEvery: 4, activeWindow: 1.5,
  muteKey: 'noise-orb:muted', masterEase: 0.025, waveformSize: 256,
  pluckMinimum: 0.05, pluckCutoff: 1600, pluckCutoffRange: 3200,
  delaySend: 0.28, impulseDecay: 3, limiterResolution: 4096,
  compressor: { threshold: -12, knee: 6, ratio: 20, attack: 0.003, release: 0.15 },
  padOctave: -12, padFifth: -5, padDetune: 4, chordIntervals: [0, 7, 14],
  arpeggio: [0, 4, 7, 9, 4, 2], ambientVelocity: 0.24, ambientWidth: 2.2, ambientDepth: 1.7,
} as const;
export const VIEW = {
  desktopCount: 160 * 80, mobileCount: 90 * 50, mobileWidth: 720, dprCap: 2,
  fov: 42, near: 0.1, far: 100, camera: [0, 5.5, 11], mobileCameraZ: 14,
  maxRipples: 8, rippleLife: 4, rippleWave: 7, rippleSpeed: 8, rippleDecay: 1.3,
  rippleFalloff: 0.4, rippleGain: 0.22, swellHeight: 0.95, swellWidth: 1.4,
  swellEase: 0.1, releaseSeconds: 0.65, wakeDecay: 0.25, wakeGain: 0.12,
  reducedScale: 0.28, reducedSpeed: 0.25, dotSize: 2.2, wakeWidth: 0.4,
  interactionRadius: 3, frameDeltaCap: 0.1, mint: '#c3e6d0', warm: '#d9b397',
} as const;
export const GESTURE = {
  dragPixels: 7, hoverSpeed: 1.2, volumeMin: 0.15, volumeMax: 0.8,
  keyboardStep: 0.07, dragMinimum: 0.35, swellMinimum: 0.55,
  tapVelocity: 0.7, tapWake: 0.5, keyboardWake: 0.4, keyboardVelocity: 0.55, keyboardSwell: 0.7,
} as const;
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
