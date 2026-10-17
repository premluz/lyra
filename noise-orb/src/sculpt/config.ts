export const SCULPT = {
  storageKey: 'noise-orb:sculpt:v1', handles: 12, width: 1.4, maxPull: 2.2,
  phaseWidth: 0.14, pitchTravel: 1.6, pitchSteps: 5, toneTravel: 0.18,
  lengthGain: 0.12, hoverRange: 2.4, hoverEase: 0.18, hoverGain: 0.2,
  hoverCutoff: 1.2, hoverDecay: 0.25, heat: 0.5, handleRadius: 0.9,
  dragThreshold: 5, keyboardPixels: 24, keyboardOrigin: 0.5,
  precision: 0.000001,
} as const;
export interface SculptPoint { x: number; y: number; z: number }
export interface SculptHandle { lane: string; anchor: SculptPoint; offset: SculptPoint }
export interface SculptFocus { proximity: number; height: number; depth: number }
export const REST_FOCUS: SculptFocus = { proximity: 0, height: 0, depth: 0 };
