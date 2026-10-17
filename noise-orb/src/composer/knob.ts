import { clamp } from '../config';
import { COMPOSE } from './config';
import type { KnobKey } from './config';
import { svg } from './waves';

export class Knob<Key extends KnobKey | 'alive' | 'speed' | 'density' | 'interpretation' = KnobKey> {
  readonly element = document.createElement('label');
  private input = document.createElement('input');
  private indicator = svg('line', { x1: 32, y1: 12, x2: 32, y2: 21, class: 'knob-indicator' });
  private value = document.createElement('output');
  private drag: { id: number; y: number; value: number } | null = null;

  constructor(readonly key: Key, label: string, hint: string, private change: (value: number) => void, private activate?: () => void, private resolution: number = COMPOSE.knobResolution) {
    this.element.className = 'knob';
    const dial = svg('svg', { viewBox: '0 0 64 64', 'aria-hidden': 'true' }), text = document.createElement('span');
    dial.append(svg('circle', { cx: 32, cy: 32, r: 27, class: 'knob-track' }), svg('circle', { cx: 32, cy: 32, r: 22, class: 'knob-face' }), this.indicator);
    text.textContent = label; text.className = 'knob-label'; this.value.className = 'knob-value';
    this.input.type = 'range'; this.input.min = '0'; this.input.max = String(resolution); this.input.step = '1'; this.input.title = hint;
    this.element.append(this.value, dial, text, this.input);
    this.input.addEventListener('input', () => { this.change(Number(this.input.value) / this.resolution); this.activate?.(); });
    this.input.addEventListener('pointerdown', (event) => this.down(event));
    this.input.addEventListener('pointermove', (event) => this.move(event));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.input.addEventListener(type, () => { this.drag = null; });
  }

  update(value: number, lane: string, label: string) {
    this.input.value = String(Math.round(value * this.resolution)); this.input.setAttribute('aria-label', `${lane} ${label}`);
    const display = this.key === 'lift' ? Math.round((value - 0.5) * COMPOSE.liftSteps * 2) : Math.round(value * 100);
    this.value.textContent = this.key === 'lift' && display > 0 ? `+${display}` : String(display);
    this.input.setAttribute('aria-valuetext', this.key === 'lift' ? `${display} scale steps` : `${display} percent`);
    this.indicator.setAttribute('transform', `rotate(${value * COMPOSE.knobAngle - COMPOSE.knobAngle / 2} 32 32)`);
  }
  readout(text: string, spoken = text) { this.value.textContent = text; this.input.setAttribute('aria-valuetext', spoken); }

  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); this.input.focus(); this.input.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, y: event.clientY, value: Number(this.input.value) / this.resolution }; this.activate?.();
  }
  private move(event: PointerEvent) {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    this.change(clamp(this.drag.value + (this.drag.y - event.clientY) / COMPOSE.knobTravel)); this.activate?.();
  }
}
