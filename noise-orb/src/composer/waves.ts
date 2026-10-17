import { COMPOSE } from './config';
import type { LaneRole } from './config';
import type { Lane } from './model';
import { pitchFor } from './model';
import { roleDefinition, isContinuous } from './lanes';
import { midiFor } from './tuning';
import type { Tuning } from './tuning';

export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}) {
  const node = document.createElementNS(COMPOSE.svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}
export function definition(role: LaneRole) { return roleDefinition(role); }
export function noteName(index: number, tuning: Tuning = 'standard') {
  const midi = midiFor(index, tuning), names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[midi % names.length]}${Math.floor(midi / names.length) - 1}`;
}
export function noteX(step: number, steps = COMPOSE.steps) { return (step + 0.5) / steps * COMPOSE.width; }
export function noteY(lane: Lane, pitch: number) {
  return COMPOSE.baseline + definition(lane.role).offset - COMPOSE.peak * lane.level - pitchFor(lane, pitch) * COMPOSE.pitchHeight;
}
export function waveY(lane: Lane, position: number, time = 0) {
  if (isContinuous(lane)) {
    if (lane.role === 'binaural') return COMPOSE.baseline - COMPOSE.peak * lane.level;
    const phase = (position / lane.notes.length * COMPOSE.driftViewSeconds + time) / lane.breath * Math.PI * 2;
    const height = COMPOSE.peak * lane.level + pitchFor(lane, lane.pitch) * COMPOSE.pitchHeight;
    return COMPOSE.baseline - height * (1 + Math.sin(phase) * lane.movement);
  }
  let height = 0;
  const width = COMPOSE.widthMin + lane.length * COMPOSE.widthRange;
  lane.notes.forEach((pitch, step) => {
    if (pitch === null) return;
    let distance = Math.abs(position - step); distance = Math.min(distance, lane.notes.length - distance);
    const amplitude = COMPOSE.peak * lane.level + pitchFor(lane, pitch) * COMPOSE.pitchHeight;
    const harmonic = 1 + Math.sin(distance * Math.PI * 2) * COMPOSE.waveAmplitude * lane.tone;
    height += amplitude * Math.exp(-distance * distance / (width * width)) * harmonic;
  });
  return Math.max(COMPOSE.plotPadding, COMPOSE.baseline + definition(lane.role).offset - height);
}
export function wavePath(lane: Lane, time = 0) {
  return Array.from({ length: COMPOSE.samples + 1 }, (_, i) => {
    const x = i / COMPOSE.samples * COMPOSE.width, position = x / COMPOSE.width * lane.notes.length - 0.5;
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${waveY(lane, position, time).toFixed(2)}`;
  }).join(' ');
}
export function waveAreaPath(edge: string) {
  return `${edge} L${COMPOSE.width},${COMPOSE.height} L0,${COMPOSE.height} Z`;
}
