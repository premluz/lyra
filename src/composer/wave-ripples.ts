import { svg } from './waves';
import { WAVE_WRAP } from './wave-wrap-geometry';

const RIPPLE = {
  copies: 3, duration: 9, opacity: 0.1, noteBoost: 0.65,
  blur: 8, stroke: 16, milliseconds: 1000, frameCap: 0.1,
  rimBlur: 0.7, rimStroke: 1.3, rimGain: 1.8, lightGain: 5,
} as const;
let serial = 0;

// Reusing the editable contour keeps each departing echo tied to its musical layer.
export class WaveRipples {
  readonly element = svg('g', { class: 'wave-ripples', 'aria-hidden': 'true' });
  private copies: SVGPathElement[] = [];
  private rims: SVGPathElement[] = [];
  private lights: SVGUseElement[] = [];
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private elapsed = 0;
  private last = performance.now();

  constructor(private edge: SVGPathElement, lightingId: string) {
    const id = `wave-ripple-${++serial}`, filterId = `${id}-soft`;
    const defs = svg('defs'), filter = svg('filter', { id: filterId, x: '-50%', y: '-50%', width: '200%', height: '200%' });
    filter.append(svg('feGaussianBlur', { stdDeviation: RIPPLE.blur })); defs.append(filter);
    const smoke = svg('filter', { id: `${id}-smoke`, x: '-5%', y: '-5%', width: '110%', height: '110%' });
    smoke.append(svg('feGaussianBlur', { stdDeviation: RIPPLE.rimBlur }));
    defs.append(smoke);
    this.element.append(defs);
    this.copies = Array.from({ length: RIPPLE.copies }, () => {
      const copy = svg('path', { class: 'ripple-haze', filter: `url(#${filterId})`, 'stroke-width': RIPPLE.stroke });
      const rim = svg('path', { class: 'ripple-rim', filter: `url(#${id}-smoke)`, 'stroke-width': RIPPLE.rimStroke });
      const light = svg('use', { class: 'ripple-lighting', href: `#${lightingId}`, 'pointer-events': 'none' });
      this.lights.push(light); this.rims.push(rim); this.element.append(copy, light, rim); return copy;
    });
  }

  paint(role: string, visible: boolean, energy: number, reach: number) {
    const now = performance.now();
    this.elapsed += Math.min((now - this.last) / RIPPLE.milliseconds, RIPPLE.frameCap); this.last = now;
    this.element.setAttribute('class', `wave-ripples lane-${role}`);
    this.element.setAttribute('visibility', visible ? 'visible' : 'hidden');
    const center = WAVE_WRAP.center;
    const contour = this.edge.getAttribute('d');
    if (!contour) throw new Error('Wave ripples require a rendered wave contour.');
    this.copies.forEach((copy, index) => {
      const phase = (this.elapsed / RIPPLE.duration + index / RIPPLE.copies) % 1;
      const progress = this.reduced.matches ? index / RIPPLE.copies : phase;
      const scale = 1 + progress * reach;
      const opacity = Math.sin(progress * Math.PI) ** 2 * RIPPLE.opacity * (1 + energy * RIPPLE.noteBoost);
      copy.setAttribute('d', contour);
      const transform = `translate(${center} ${center}) scale(${scale}) translate(${-center} ${-center})`;
      copy.setAttribute('transform', transform);
      copy.setAttribute('opacity', String(opacity));
      const rim = this.rims[index], light = this.lights[index];
      if (!rim || !light) throw new Error('Wave ripple is missing its edge lighting.');
      rim.setAttribute('d', contour);
      rim.setAttribute('transform', transform);
      rim.setAttribute('opacity', String(opacity * RIPPLE.rimGain));
      light.setAttribute('transform', transform); light.setAttribute('opacity', String(opacity * RIPPLE.lightGain));
    });
  }
}
