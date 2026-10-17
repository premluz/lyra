export interface Knob { key: string; label: string; min: number; max: number; step?: number }
export const MOTION_KNOBS: Record<string, Knob[]> = {
  lab: [{ key: 'uOrbAmp', label: 'Amplitude', min: 0, max: 4 }, { key: 'uOrbFreq', label: 'Frequency', min: 0.01, max: 2 }, { key: 'uOrbSpeed', label: 'Speed', min: 0, max: 2 }],
  terrain: [{ key: 'uTerrainAmp', label: 'Amplitude', min: 0, max: 8 }, { key: 'uTerrainFreq', label: 'Frequency', min: 0.01, max: 2 }, { key: 'uTerrainSpeed', label: 'Speed', min: 0, max: 2 }],
  volatility: [{ key: 'uVolatilityAmp', label: 'Amplitude', min: 0, max: 8 }, { key: 'uVolatilityFreq', label: 'Frequency', min: 0.01, max: 1 }, { key: 'uVolatilitySpeed', label: 'Speed', min: 0, max: 2 }],
  helix: [{ key: 'uHelixWaveAmp', label: 'Wave amplitude', min: 0, max: 1 }, { key: 'uHelixWaveFreq', label: 'Wave frequency', min: 0.1, max: 8 }, { key: 'uHelixWaveSpeed', label: 'Wave speed', min: 0, max: 4 }, { key: 'uHelixTubeRadius', label: 'Tube radius', min: 0.1, max: 4 }],
  grid: [{ key: 'uGridWaveAmp', label: 'Wave amplitude', min: 0, max: 3 }, { key: 'uGridWaveFreq', label: 'Wave frequency', min: 0.1, max: 4 }, { key: 'uGridRippleAmp', label: 'Click ripple', min: 0, max: 4 }, { key: 'uGridRippleLife', label: 'Ripple life', min: 0.1, max: 8 }],
  'ribbon-dispersed-pulse': [{ key: 'uPulseCycleS', label: 'Pulse cycle', min: 1, max: 20 }, { key: 'uPulseBandWidth', label: 'Band width', min: 0.01, max: 1 }, { key: 'uPulseTailStretch', label: 'Tail stretch', min: 0.1, max: 4 }, { key: 'uPulseBreatheDepth', label: 'Breathe depth', min: 0, max: 1 }],
};
export const FIELD_KNOBS: Knob[] = [
  { key: 'uIdleDriftAmount', label: 'Idle drift', min: 0, max: 1 },
  { key: 'uPointerAmount', label: 'Pointer influence', min: 0, max: 1 },
  { key: 'uPointerRadius', label: 'Pointer radius', min: 0.1, max: 5 },
  { key: 'uPointerPush', label: 'Pointer force', min: 0, max: 3 },
  { key: 'uFreeFloatRatio', label: 'Free particles', min: 0, max: 1 },
  { key: 'uFreeFloatDrift', label: 'Float drift', min: 0, max: 4 },
];
export const HALFTONE_KNOBS: Knob[] = [
  { key: 'uHalftoneSizeNear', label: 'Near dot size', min: 0.5, max: 8 },
  { key: 'uHalftoneSizeFar', label: 'Far dot size', min: 0.1, max: 4 },
  { key: 'uHalftoneAlphaNear', label: 'Near opacity', min: 0, max: 1 },
  { key: 'uHalftoneAlphaFar', label: 'Far opacity', min: 0, max: 1 },
];
