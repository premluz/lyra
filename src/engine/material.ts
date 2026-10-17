import { AdditiveBlending, Color, ShaderMaterial, Vector2 } from 'three';
import vertex from './extracted/vertex';
import fragmentShader from './extracted/fragment';
import { styleUniforms } from './extracted/uniforms';
import { ENGINE } from './constants';

export type UniformValue = number | boolean | Color | Vector2;
export type Uniforms = Record<string, { value: UniformValue }>;

function baseUniforms(): Uniforms {
  return {
    uStudioColor: { value: new Color() }, uDprNorm: { value: 1 },
    uEntrance: { value: 1 }, uRadialFadeRadius: { value: ENGINE.dotsFade },
    uRadialFadeFrom: { value: 0 }, uRadialFadeTo: { value: 0 },
    sizeScale: { value: 1 }, uMorphProgress: { value: 0 },
    uGlowStrength: { value: 1 }, uGlowRadius: { value: ENGINE.glowRadius },
    uCoreMult: { value: ENGINE.coreMult }, uHaloMult: { value: ENGINE.haloMult },
    uSpriteScale: { value: ENGINE.glowRadius * ENGINE.spriteRoom },
    uWavefront: { value: ENGINE.wavefront }, uWaveFalloff: { value: ENGINE.waveFalloff },
    uWaveColor: { value: new Color() }, uPrefersReducedMotion: { value: false },
    uGlobalAlpha: { value: 1 }, uTime: { value: 0 },
  };
}

export function createMaterial() {
  const uniforms: Uniforms = { ...baseUniforms(), ...styleUniforms() };
  const vertexShader = vertex.replace('attribute vec3 color;', 'uniform vec3 uStudioColor;\n#define color uStudioColor');
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms,
    transparent: true, blending: AdditiveBlending, depthWrite: false,
  });
  return { material, uniforms };
}
