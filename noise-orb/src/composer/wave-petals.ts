import { svg } from './waves';

const PETAL = {
  count: 7, tangent: 90, depth: 32, inset: -18, speed: 0.012, breath: 0.38,
  floor: 0.4, range: 0.45, drift: 0.018, tangentSample: 1, turn: Math.PI * 2,
  degrees: 180 / Math.PI, milliseconds: 1000, rimWidth: 0.65,
  colours: ['hsl(282 78% 59%)', 'hsl(306 70% 54%)', 'hsl(258 70% 57%)'],
  stops: [{ offset: '0%', opacity: 0.68 }, { offset: '40%', opacity: 0.25 }, { offset: '100%', opacity: 0 }],
} as const;
let serial = 0;

export class WavePetals {
  private seed = ++serial;
  readonly lightingId = `wave-petal-lighting-${this.seed}`;
  private clip = svg('path', { 'clip-rule': 'evenodd' });
  private lights: SVGEllipseElement[] = [];
  private rim = svg('path', { class: 'wave-petal-rim', 'stroke-width': PETAL.rimWidth });
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private gradient: SVGLinearGradientElement;

  constructor(parent: SVGGElement, private edge: SVGPathElement) {
    const id = `wave-petals-${this.seed}`, defs = svg('defs'), clip = svg('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
    clip.append(this.clip); defs.append(clip);
    const group = svg('g', { id: this.lightingId, class: 'wave-petals', 'clip-path': `url(#${id})` });
    PETAL.colours.forEach((colour, index) => {
      const gradient = svg('radialGradient', { id: `${id}-${index}` });
      PETAL.stops.forEach(stop => gradient.append(svg('stop', { offset: stop.offset, 'stop-color': colour, 'stop-opacity': stop.opacity })));
      defs.append(gradient);
    });
    this.gradient = svg('linearGradient', { id: `${id}-rim`, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    PETAL.colours.forEach((colour, index) => this.gradient.append(svg('stop', {
      offset: `${index / (PETAL.colours.length - 1) * 100}%`, 'stop-color': colour, 'stop-opacity': index === 1 ? 0.65 : 0.15,
    })));
    defs.append(this.gradient); this.rim.setAttribute('stroke', `url(#${id}-rim)`);
    this.lights = Array.from({ length: PETAL.count }, (_, index) => {
      const light = svg('ellipse', { rx: PETAL.tangent, ry: PETAL.depth, fill: `url(#${id}-${index % PETAL.colours.length})` });
      group.append(light); return light;
    });
    group.append(this.rim); parent.insertBefore(defs, edge); parent.insertBefore(group, edge);
  }

  paint(area: string) {
    this.clip.setAttribute('d', area);
    const contour = this.edge.getAttribute('d');
    if (!contour) throw new Error('Petal lighting requires a wave contour.');
    this.rim.setAttribute('d', contour);
    const time = this.reduced.matches ? 0 : performance.now() / PETAL.milliseconds;
    const length = this.edge.getTotalLength();
    if (!length) throw new Error('Petal lighting requires a non-empty wave contour.');
    this.gradient.setAttribute('gradientTransform', `rotate(${time * PETAL.breath} .5 .5)`);
    this.lights.forEach((light, index) => {
      const phase = (index / PETAL.count + this.seed / PETAL.count + time * PETAL.speed
        + Math.sin(time * PETAL.breath + index) * PETAL.drift) % 1;
      const point = this.edge.getPointAtLength(phase * length);
      const ahead = this.edge.getPointAtLength((phase * length + PETAL.tangentSample) % length);
      const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x);
      const x = point.x - Math.sin(angle) * PETAL.inset, y = point.y + Math.cos(angle) * PETAL.inset;
      light.setAttribute('transform', `translate(${x} ${y}) rotate(${angle * PETAL.degrees})`);
      light.setAttribute('opacity', String(PETAL.floor + PETAL.range * (1 + Math.sin(time * PETAL.breath + index * PETAL.turn / PETAL.count)) / 2));
    });
  }
}
