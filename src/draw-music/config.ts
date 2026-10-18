import { COMPOSE } from '../composer/config';
import { TICK } from '../score';
export const DRAW_MUSIC = {
  storageKey: 'noise-orb:draw-music:v1', interpretation: 0.25,
  holdAfter: 0.3, liveHold: COMPOSE.steps * TICK, release: 0.12,
  maxPoints: 2048, spacing: 0.002, alive: 0.14, keyStep: 0.04,
  layers: [
    { id: 'melody', name: 'Your hook', low: 0, high: 10 },
    { id: 'undertow', name: 'Bass', low: 0, high: 4 },
    { id: 'air', name: 'Chimes', low: 7, high: 12 },
  ],
} as const;
