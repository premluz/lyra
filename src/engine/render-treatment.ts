import { AdditiveBlending, NormalBlending, Points } from 'three';
import type { BufferGeometry, ShaderMaterial } from 'three';
import type { Uniforms } from './material';
import { setNumber } from './apply';

// Blending is GPU state, so two weighted passes avoid switching it at 50%.
export class RenderTreatment {
  readonly ink: Points<BufferGeometry, ShaderMaterial>;
  private inkUniforms: Uniforms;

  constructor(private glow: Points<BufferGeometry, ShaderMaterial>, private uniforms: Uniforms) {
    const material = glow.material.clone();
    this.inkUniforms = { ...uniforms, uHalftoneProgress: { value: 1 }, uGlobalAlpha: { value: 0 } };
    material.uniforms = this.inkUniforms;
    material.blending = NormalBlending;
    this.ink = new Points(glow.geometry, material);
    this.ink.matrixAutoUpdate = false;
    this.ink.frustumCulled = false;
    this.ink.renderOrder = glow.renderOrder + 1;
  }

  update(light: boolean) {
    const amount = this.uniforms.uHalftoneProgress.value, opacity = this.uniforms.uGlobalAlpha.value;
    if (typeof amount !== 'number' || typeof opacity !== 'number') throw new Error('Render treatment requires numeric opacity and weight.');
    this.glow.visible = amount < 1;
    this.ink.visible = amount > 0;
    this.glow.material.blending = light ? NormalBlending : AdditiveBlending;
    this.glow.updateMatrix();
    this.ink.matrix.copy(this.glow.matrix);
    setNumber(this.uniforms, 'uHalftoneProgress', 0);
    setNumber(this.uniforms, 'uGlobalAlpha', opacity * (1 - amount));
    setNumber(this.inkUniforms, 'uGlobalAlpha', opacity * amount);
  }

  dispose() { this.ink.material.dispose(); }
}
