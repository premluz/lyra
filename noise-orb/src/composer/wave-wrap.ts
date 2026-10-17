import type { Score } from './model';
import { isAudible, isContinuous } from './lanes';
import { svg } from './waves';
import { WaveRibbon } from './wave-ribbon';
import { WAVE_WRAP, wrappedPaths } from './wave-wrap-geometry';
import { element, report } from '../ui';
import { WrappedHandles } from './wrapped-handles';
import { WrappedGesture } from './wrapped-gesture';
import type { WrappedPulse } from './wave-wrap-geometry';
import { WaveRipples } from './wave-ripples';

const CLOCK = { milliseconds: 1000 } as const;

export class WaveWrap {
  private host = document.createElement('div');
  private drawing = svg('svg', { viewBox: `0 0 ${WAVE_WRAP.size} ${WAVE_WRAP.size}`, preserveAspectRatio: 'xMidYMid meet', role: 'group', 'aria-label': 'Wrapped note editor' });
  private handles: WrappedHandles;
  private gesture: WrappedGesture;
  private ribbons = new Map<string, WaveRibbon>();
  private ripples = new Map<string, WaveRipples>();
  private pulses: { lane: string; time: number; phase: number }[] = [];
  private time = 0;
  private painted = -Infinity;
  private enabled = localStorage.getItem(WAVE_WRAP.key) === 'true';

  constructor(private score: Score, audition: (step: number) => void) {
    this.host.className = 'wave-wrap'; this.host.id = 'wrapped-waves'; this.host.append(this.drawing);
    const c = WAVE_WRAP.center, r = WAVE_WRAP.editRadius;
    this.drawing.append(svg('path', { class: 'wrap-add-zone', d: `M${c},${c - r} A${r},${r} 0 1 1 ${c},${c + r} A${r},${r} 0 1 1 ${c},${c - r}`, 'stroke-width': WAVE_WRAP.editWidth,
      role: 'button', tabindex: 0, 'aria-label': 'Add note to selected wave' }));
    this.handles = new WrappedHandles(score, this.drawing); this.gesture = new WrappedGesture(score, this.drawing, audition);
    const help = document.createElement('p'); help.className = 'wrapped-wave-help';
    help.textContent = 'Drag dots for pitch · Drag ribbons to shift notes · Tap the ring to add'; this.host.append(help);
    element('mesh', HTMLDivElement).append(this.host);
    const label = document.createElement('label'), input = document.createElement('input');
    label.className = 'ambient-switch wave-wrap-switch'; input.type = 'checkbox'; input.setAttribute('role', 'switch'); input.checked = this.enabled;
    label.append(input, 'Wrap waves around orb');
    const settings = document.querySelector('#dev-settings .dev-settings-panel');
    if (!settings) throw new Error('Wrapped waves need the Dev settings panel.');
    settings.prepend(label);
    input.addEventListener('change', () => {
      this.gesture.cancel(); this.enabled = input.checked; this.update();
      try { localStorage.setItem(WAVE_WRAP.key, String(this.enabled)); } catch (error) { report(error); }
    });
    this.update();
  }

  update() {
    this.host.hidden = !this.enabled; element('instrument', HTMLElement).dataset.wavesWrapped = String(this.enabled);
    element('mesh', HTMLDivElement).dataset.frameScale = String(this.enabled ? WAVE_WRAP.orbScale : 1);
    for (const [id, ribbon] of this.ribbons) {
      if (!this.score.state.lanes.some(lane => lane.id === id)) {
        ribbon.element.remove(); this.ribbons.delete(id); this.ripples.get(id)?.element.remove(); this.ripples.delete(id);
      }
    }
    for (const lane of this.score.state.lanes) {
      if (!this.ribbons.has(lane.id)) {
        const ribbon = new WaveRibbon('radial'); ribbon.edge.setAttribute('class', 'wrapped-wave-line');
        ribbon.edge.dataset.lane = lane.id;
        const ripple = new WaveRipples(ribbon.edge, ribbon.lightingId); this.ripples.set(lane.id, ripple); this.drawing.prepend(ripple.element);
        this.ribbons.set(lane.id, ribbon); this.drawing.append(ribbon.element);
      }
    }
    this.render();
  }

  note(lane: string, time: number, step: number) {
    const source = this.score.lane(lane); this.pulses.push({ lane, time, phase: (step + 0.5) / source.notes.length });
  }
  cancel() { this.gesture.cancel(); }

  paint(time: number, tick: number) {
    this.time = time;
    this.pulses = tick < 0 ? [] : this.pulses.filter(note => time - note.time < WAVE_WRAP.pulseLife);
    const now = performance.now() / CLOCK.milliseconds;
    if (!this.enabled || now - this.painted < 1 / WAVE_WRAP.fps) return;
    this.painted = now; this.render();
  }

  private render() {
    if (!this.enabled) return;
    const viewport = this.drawing.getBoundingClientRect();
    if (!viewport.width || !viewport.height) throw new Error('Wrapped waves need a measurable viewport.');
    const aspect = Math.max(viewport.width / viewport.height, viewport.height / viewport.width);
    const reach = WAVE_WRAP.center * aspect / WAVE_WRAP.editRadius - 1;
    const profiles = new Map<string, readonly WrappedPulse[]>();
    for (const lane of this.score.state.lanes) {
      const ribbon = this.ribbons.get(lane.id);
      if (!ribbon) throw new Error(`Wrapped waves lost lane ${lane.id}.`);
      const filled = isContinuous(lane) || lane.notes.some(pitch => pitch !== null);
      ribbon.state(lane.role, lane.id === this.score.state.selected, lane.enabled, isAudible(lane, this.score.state.ambientTools) && filled, filled);
      const pulses = this.pulses.filter(note => note.lane === lane.id && this.time >= note.time)
        .map(note => ({ phase: note.phase, strength: (1 - (this.time - note.time) / WAVE_WRAP.pulseLife) ** 2 }));
      profiles.set(lane.id, pulses);
      const paths = wrappedPaths(lane, this.time, pulses); ribbon.draw(paths.edge, paths.area);
      this.ripples.get(lane.id)?.paint(lane.role, lane.enabled && isAudible(lane, this.score.state.ambientTools) && filled,
        Math.min(1, pulses.reduce((sum, pulse) => sum + pulse.strength, 0)), reach);
    }
    this.handles.update(this.time, profiles);
  }
}
