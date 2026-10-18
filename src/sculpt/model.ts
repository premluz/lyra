import { clamp } from '../config';
import { COMPOSE } from '../composer/config';
import type { Lane } from '../composer/model';
import { orderedPitches } from '../composer/rhythm';
import { laneAngle } from '../composer/music-field';
import { SCULPT } from './config';
import type { SculptPoint } from './config';

export function sculptPhase(anchor: SculptPoint, lane: string) {
  const phase = Math.atan2(anchor.z, anchor.x) / (Math.PI * 2) + 0.5 + laneAngle(lane) / (Math.PI * 2);
  return phase % 1;
}
export function sculptLane(base: Lane, anchor: SculptPoint, offset: SculptPoint): Lane {
  const center = sculptPhase(anchor, base.id);
  const amount = clamp(offset.y / SCULPT.pitchTravel, -1, 1) * SCULPT.pitchSteps;
  const notes = base.notes.map((pitch, step) => {
    if (pitch === null) return null;
    const distance = Math.abs(step / base.notes.length - center);
    const weight = Math.exp(-((Math.min(distance, 1 - distance) / SCULPT.phaseWidth) ** 2));
    return Math.round(clamp(pitch + amount * weight, COMPOSE.pitchMin, COMPOSE.pitchMax));
  });
  const lane = { ...base, notes, tone: clamp(base.tone + offset.x * SCULPT.toneTravel),
    length: clamp(base.length + Math.hypot(offset.x, offset.y, offset.z) * SCULPT.lengthGain) };
  lane.motif = orderedPitches(lane);
  return lane;
}
