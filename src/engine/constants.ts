export const ENGINE = {
  fov: 55, near: 0.1, far: 1000, pixelRatioCap: 2,
  glowRadius: 2.8, spriteRoom: 2.12, coreMult: 1.8, haloMult: 1.5,
  wavefront: 9999, waveFalloff: 2, sizeDefault: 0.5,
  pointerEase: 0.055, trailEase: 0.006, trailDecay: 0.994,
  pointerSpeedRef: 1, speedDecay: 0.88, chargeRate: 0.012, dischargeRate: 0.035,
  degrees: Math.PI / 180, frozenTime: 3, milliseconds: 1000,
  gridMouseScale: 8, dotsFade: 9, sampleSize: 6,
} as const;
export const LIMITS = { countMin: 1000, countMax: 30000, countStep: 1000, frameGap: 0.005, nameMax: 80 } as const;
export const MODEL_FILES = { mobile: 'mobile', note: 'note', diamond: 'diamond', globe: 'globe', game: 'game', chart: 'chart', email: 'email', camera: 'camera', footer: 'sim' } as const;
