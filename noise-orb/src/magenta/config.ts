export const MAGENTA = {
  checkpoint: 'models/musicvae', model: 'mel_2bar_small', modelSteps: 32, stepsPerQuarter: 4,
  candidates: 3, similarity: 0.72, temperature: 0.65, timeoutMs: 90000,
  storageKey: 'noise-orb:advanced-v3:v1',
  contourWeight: 0.7, densityWeight: 0.3,
} as const;
