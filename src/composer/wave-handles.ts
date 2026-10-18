export class WaveHandles {
  constructor(private surface: SVGSVGElement) {
    const observer = new ResizeObserver(() => this.refresh()); observer.observe(surface);
  }

  refresh() {
    const matrix = this.surface.getScreenCTM();
    if (!matrix) return;
    const xScale = Math.hypot(matrix.a, matrix.b), yScale = Math.hypot(matrix.c, matrix.d);
    if (!xScale || !yScale) return;
    for (const dot of this.surface.querySelectorAll('circle')) {
      const x = dot.cx.baseVal.value, y = dot.cy.baseVal.value;
      dot.setAttribute('transform', `translate(${x} ${y}) scale(${1 / xScale} ${1 / yScale}) translate(${-x} ${-y})`);
    }
  }
}
