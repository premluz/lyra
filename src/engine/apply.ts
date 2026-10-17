import { Color, PerspectiveCamera, Points } from 'three';
import { ENGINE } from './constants';
import { lerp, vectorMix } from './director';
import { styleDefinitions } from './extracted/styles';
import { styleUniforms } from './extracted/uniforms';
import type { Uniforms } from './material';
import type { DirectorSample } from './types';

export function setNumber(uniforms: Uniforms, key: string, value: number) {
  const uniform = uniforms[key];
  if (!uniform || typeof uniform.value !== 'number') throw new Error(`Unknown numeric shader uniform: ${key}`);
  uniform.value = value;
}

export function applyStyles(uniforms: Uniforms, sample: DirectorSample) {
  const { from, to, mix } = sample;
  for (const [key, uniform] of Object.entries(styleUniforms())) {
    if (typeof uniform.value !== 'number') continue;
    const a = from.state.uniforms[key] ?? uniform.value, b = to.state.uniforms[key] ?? uniform.value;
    setNumber(uniforms, key, lerp(a, b, mix));
  }
  for (const style of styleDefinitions) {
    if (!style.progressUniform) continue;
    setNumber(uniforms, style.progressUniform, lerp(Number(from.state.motion === style.key), Number(to.state.motion === style.key), mix));
  }
  setNumber(uniforms, 'uHalftoneProgress', lerp(Number(from.state.renderStyle === 'halftone'), Number(to.state.renderStyle === 'halftone'), mix));
  setNumber(uniforms, 'uRadialFadeFrom', Number(from.state.shape === 'dots'));
  setNumber(uniforms, 'uRadialFadeTo', Number(to.state.shape === 'dots'));
}

export function applyScene(points: Points, camera: PerspectiveCamera, uniforms: Uniforms, sample: DirectorSample) {
  const { from: { state: a }, to: { state: b }, mix } = sample;
  points.position.fromArray(vectorMix(a.position, b.position, mix));
  const rotation = vectorMix(a.rotation, b.rotation, mix);
  points.rotation.set(rotation[0] * ENGINE.degrees, rotation[1] * ENGINE.degrees, rotation[2] * ENGINE.degrees);
  points.scale.setScalar(lerp(a.scale, b.scale, mix));
  camera.position.z = lerp(a.cameraZ, b.cameraZ, mix);
  setNumber(uniforms, 'sizeScale', lerp(a.size, b.size, mix));
  setNumber(uniforms, 'uGlobalAlpha', lerp(a.opacity, b.opacity, mix));
  const color = uniforms.uStudioColor.value, wave = uniforms.uWaveColor.value;
  if (color instanceof Color) color.set(a.color).lerp(new Color(b.color), mix);
  if (wave instanceof Color) wave.set(a.waveColor).lerp(new Color(b.waveColor), mix);
}
