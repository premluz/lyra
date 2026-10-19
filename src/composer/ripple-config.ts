import { COMPOSE, type LaneRole } from './config';
import { WAVE_WRAP } from './wave-wrap-geometry';

export const RIPPLE = {
  samples: COMPOSE.samples + 1, segments: COMPOSE.samples, lanes: COMPOSE.maxLanes,
  copies: 3, duration: 9, frameCap: 0.1, width: 32, opacity: 0.16,
  noteBoost: 0.65, balancedLanes: 3,
  colours: { melody: 'hsl(288, 54%, 42%)', undertow: 'hsl(267, 45%, 40%)', air: 'hsl(300, 45%, 43%)',
    drone: 'hsl(288, 54%, 42%)', binaural: 'hsl(300, 45%, 43%)' } satisfies Record<LaneRole, string>,
} as const;

export const RIPPLE_SHADER = {
  TAU: Math.PI * 2, PI: Math.PI, HALF_PI: Math.PI / 2,
  SAMPLES: RIPPLE.samples, SEGMENTS: RIPPLE.segments, LANES: RIPPLE.lanes,
  COPIES: RIPPLE.copies, DURATION: RIPPLE.duration, WIDTH: RIPPLE.width,
  OPACITY: RIPPLE.opacity, BOOST: RIPPLE.noteBoost, CENTER: WAVE_WRAP.center,
  INNER: WAVE_WRAP.radius, WIDTH_GROWTH: 0.5,
  PETALS: 7, FOLDS: 3, DRIFT: 0.12, WARP: 0.7, BODY: 7, RIM: 180,
  RIM_GAIN: 0.45, LIGHT_FLOOR: 0.2, LIGHT_RANGE: 0.8, TINT: 0.4,
  EDGE_START: 0.8, EDGE_END: 1, CLIP_START: 0.88, CLIP_END: 1,
} as const;
