import type { Score } from './model';
import { isContinuous } from './lanes';
import { svg, noteName } from './waves';
import { WaveHandles } from './wave-handles';
import { COMPOSE } from './config';
import { WAVE_WRAP, wrappedPoint, wrappedRadius } from './wave-wrap-geometry';
import type { WrappedPulse } from './wave-wrap-geometry';

export class WrappedHandles {
  private group = svg('g', { class: 'wrapped-handles' });
  private nodes = new Map<string, SVGCircleElement>();
  private sizing: WaveHandles;
  constructor(private score: Score, private drawing: SVGSVGElement) {
    drawing.append(this.group); this.sizing = new WaveHandles(drawing);
  }

  update(time: number, pulses: ReadonlyMap<string, readonly WrappedPulse[]>) {
    const active = new Set<string>();
    for (const lane of this.score.state.lanes) {
      if (isContinuous(lane)) continue;
      lane.notes.forEach((pitch, step) => {
        if (pitch === null) return;
        const key = `${lane.id}:${step}`; active.add(key);
        let node = this.nodes.get(key);
        if (!node) { node = svg('circle', { r: WAVE_WRAP.handleRadius, role: 'slider' }); this.nodes.set(key, node); this.group.append(node); }
        const phase = (step + 0.5) / lane.notes.length, position = wrappedPoint(phase, wrappedRadius(lane, phase, time, pulses.get(lane.id) ?? []));
        node.setAttribute('cx', String(position.x)); node.setAttribute('cy', String(position.y));
        node.setAttribute('class', `wrapped-note-handle lane-${lane.role}`); node.dataset.lane = lane.id; node.dataset.step = String(step);
        node.dataset.selected = String(lane.id === this.score.state.selected); node.setAttribute('tabindex', lane.id === this.score.state.selected ? '0' : '-1');
        node.setAttribute('aria-label', `${lane.name} note ${step + 1}`); node.setAttribute('aria-valuemin', String(COMPOSE.pitchMin));
        node.setAttribute('aria-valuemax', String(COMPOSE.pitchMax)); node.setAttribute('aria-valuenow', String(pitch)); node.setAttribute('aria-valuetext', noteName(pitch, this.score.activeTuning));
      });
    }
    for (const [key, node] of this.nodes) if (!active.has(key)) { node.remove(); this.nodes.delete(key); }
    if (this.drawing.lastElementChild !== this.group) this.drawing.append(this.group);
    this.sizing.refresh();
  }
}
