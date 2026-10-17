import { element, ui } from '../ui';
import { AURA } from './config';
import type { AuraInteraction } from './interaction';
import type { AuraWorld } from './generation';

const WORDS = { idle: 'Move to wander. Hold to unfold.', gather: 'Gathering light.', open: 'A little more room.', bloom: 'Let it bloom.' } as const;
export class AuraView {
  private title = element('aura-title', HTMLOutputElement);
  private caption = element('aura-caption', HTMLOutputElement);
  private label = element('aura-generate-label', HTMLSpanElement);
  private cursor = document.getElementById('aura-cursor');
  private ring: SVGCircleElement;
  private width = 0;
  private height = 0;
  constructor(private state: AuraInteraction, world: AuraWorld) {
    const ring = document.getElementById('aura-hold');
    if (!(ring instanceof SVGCircleElement) || !(this.cursor instanceof SVGSVGElement)) throw new Error('Aura is missing its hold indicator.');
    this.ring = ring; this.ring.setAttribute('r', String(AURA.cursorRadius));
    this.ring.setAttribute('stroke-dasharray', String(Math.PI * 2 * AURA.cursorRadius));
    this.preview(world);
  }
  preview(world: AuraWorld) {
    ui.root.dataset.world = String(world.seed); ui.root.dataset.palette = String(world.palette);
    this.title.textContent = world.title;
  }
  begin(world: AuraWorld) {
    this.preview(world); ui.root.dataset.begun = 'true'; ui.sound.hidden = false;
    this.label.textContent = 'Generate another';
  }
  paint() {
    const state = this.state, phase = state.phase;
    if (ui.root.dataset.phase !== phase) { ui.root.dataset.phase = phase; this.caption.textContent = WORDS[phase]; }
    ui.root.dataset.held = String(state.held);
    const { width, height } = ui.root.getBoundingClientRect();
    if (width !== this.width || height !== this.height) {
      this.cursor?.setAttribute('viewBox', `0 0 ${width} ${height}`); this.width = width; this.height = height;
    }
    this.ring.setAttribute('cx', String(state.nx * width)); this.ring.setAttribute('cy', String(state.ny * height));
    this.ring.setAttribute('stroke-dashoffset', String(Math.PI * 2 * AURA.cursorRadius * (1 - Math.min(1, state.age / AURA.bloomAt))));
  }
}
