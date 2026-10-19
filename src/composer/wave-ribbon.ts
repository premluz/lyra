import { svg } from './waves';
import { WavePetals } from './wave-petals';

const RIBBON = {
  linear: { fade: ['0%', '45%', '100%'], opacity: [0.58, 0.24, 0] },
  radial: { fade: ['0%', '55%', '75%', '100%'], opacity: [0, 0, 0.08, 0.18] },
} as const;
let serial = 0;

// Independent contours let horizontal and circular layouts share one ribbon material.
export class WaveRibbon {
  readonly element = svg('g', { class: 'wave-ribbon', 'aria-hidden': 'true' });
  readonly edge = svg('path', { class: 'wave-line' });
  private fill = svg('path', { class: 'wave-ribbon-fill' });
  private glow = svg('path', { class: 'wave-ribbon-glow' });
  private petals: WavePetals | null = null;

  constructor(projection: 'linear' | 'radial' = 'linear') {
    const id = `wave-ribbon-${++serial}`, defs = svg('defs');
    const gradient = projection === 'radial' ? svg('radialGradient', { id, class: 'wave-base-gradient' })
      : svg('linearGradient', { id, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    const paint = RIBBON[projection];
    paint.fade.forEach((offset, index) => gradient.append(svg('stop', {
      offset, 'stop-color': 'currentColor', 'stop-opacity': paint.opacity[index],
    })));
    defs.append(gradient);
    this.fill.setAttribute('fill', `url(#${id})`); this.glow.setAttribute('fill', `url(#${id})`);
    this.element.append(defs, this.glow, this.fill, this.edge);
    if (projection === 'radial') this.petals = new WavePetals(this.element, this.edge);
  }

  draw(edge: string, area: string) {
    this.edge.setAttribute('d', edge); this.fill.setAttribute('d', area); this.glow.setAttribute('d', area);
    this.petals?.paint(area);
  }

  state(role: string, selected: boolean, enabled: boolean, visible: boolean, filled: boolean) {
    this.element.setAttribute('class', `wave-ribbon lane-${role}`);
    this.element.dataset.selected = String(selected); this.element.dataset.enabled = String(enabled);
    this.element.dataset.empty = String(!filled);
    this.element.setAttribute('visibility', visible ? 'visible' : 'hidden');
  }
}
