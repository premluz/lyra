import { COMPOSE } from './config';
import type { LaneRole } from './config';
import type { LaneRate } from './pace';

export const ARRANGE = {
  cycleSteps: COMPOSE.steps * 2, octaveSteps: 5, bassMotif: [0, 3, 0, 5], echoStride: 2,
  supportingLevel: [0.32, 0.48],
  rates: {
    melody: [0.5, 1, 1.5, 2], undertow: [0.5, 1, 2], air: [0.5, 1, 1.5, 2], drone: [1], binaural: [1],
  } satisfies Record<LaneRole, readonly LaneRate[]>,
} as const;
