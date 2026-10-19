import { AdditiveBlending, Color, DataTexture, DoubleSide, FloatType, Mesh, OrthographicCamera, RedFormat, Scene, ShaderMaterial, Vector2 } from 'three';
import type { WebGLRenderer } from 'three';
import type { VisualBackground } from '../visual/visualisation';
import type { LaneRole } from './config';
import { RIPPLE, RIPPLE_SHADER } from './ripple-config';
import { rippleGeometry } from './ripple-geometry';
import vertex from './ripple-vertex.glsl?raw';
import fragment from './ripple-fragment.glsl?raw';

export interface RippleProfile { radii: Float32Array; role: LaneRole; energy: number }
const defines = Object.entries(RIPPLE_SHADER).map(([key, value]) => `#define ${key} ${value.toFixed(8)}`).join('\n');

// One instanced strip pass replaces the expanding SVG filter surfaces, sharing the orb's context.
export class WaveRipples implements VisualBackground {
  private geometry = rippleGeometry();
  private profiles = new Float32Array(RIPPLE.samples * RIPPLE.lanes);
  private texture = new DataTexture(this.profiles, RIPPLE.samples, RIPPLE.lanes, RedFormat, FloatType);
  private uniforms = { uProfiles: { value: this.texture }, uTime: { value: 0 }, uSize: { value: new Vector2() }, uGain: { value: 1 } };
  private material = new ShaderMaterial({ vertexShader: `${defines}\n${vertex}`, fragmentShader: `${defines}\n${fragment}`,
    uniforms: this.uniforms, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, blending: AdditiveBlending });
  private scene = new Scene();
  private camera = new OrthographicCamera();
  private reduced: MediaQueryList | null = null;
  private opaque: MediaQueryList | null = null;
  private enabled = false;
  private disposed = false;

  constructor() {
    const mesh = new Mesh(this.geometry, this.material); mesh.frustumCulled = false; this.scene.add(mesh);
    this.texture.generateMipmaps = false;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.reduced ??= matchMedia('(prefers-reduced-motion: reduce)');
      this.opaque ??= matchMedia('(prefers-reduced-transparency: reduce)');
    }
  }

  update(layers: readonly RippleProfile[]) {
    if (!this.enabled || this.disposed || this.opaque?.matches) return;
    if (layers.length > RIPPLE.lanes) throw new Error(`Outward waves support at most ${RIPPLE.lanes} layers.`);
    const attributes = this.geometry.getAttribute('aLayer'), colours = this.geometry.getAttribute('aColour');
    layers.forEach((layer, row) => {
      if (layer.radii.length !== RIPPLE.samples || layer.radii.some(radius => !Number.isFinite(radius) || radius <= 0)) {
        throw new Error(`Outward wave ${row} has an invalid contour.`);
      }
      this.profiles.set(layer.radii, row * RIPPLE.samples);
      const colour = new Color(RIPPLE.colours[layer.role]);
      for (let copy = 0; copy < RIPPLE.copies; copy++) {
        const index = row * RIPPLE.copies + copy;
        attributes.setXYZ(index, row, copy, layer.energy); colours.setXYZ(index, colour.r, colour.g, colour.b);
      }
    });
    this.geometry.instanceCount = layers.length * RIPPLE.copies;
    this.uniforms.uGain.value = Math.min(1, Math.sqrt(RIPPLE.balancedLanes / Math.max(1, layers.length)));
    attributes.needsUpdate = true; colours.needsUpdate = true; this.texture.needsUpdate = true;
  }

  render(renderer: WebGLRenderer, delta: number) {
    if (!this.enabled || this.disposed || this.opaque?.matches || !this.geometry.instanceCount) return;
    if (!this.reduced?.matches) this.uniforms.uTime.value = this.uniforms.uTime.value + Math.min(delta, RIPPLE.frameCap);
    renderer.getSize(this.uniforms.uSize.value);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true; this.geometry.dispose(); this.texture.dispose(); this.material.dispose(); this.scene.clear();
  }
}
