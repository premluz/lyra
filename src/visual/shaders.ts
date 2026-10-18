import first from '../particle-core/vertex-0.glsl?raw';
import second from '../particle-core/vertex-1.glsl?raw';
import interaction from './interaction.glsl?raw';
import { VIEW } from '../config';

const source = [first, second].join('\n');
const boundary = source.indexOf('void main() {');
if (boundary < 0) throw new Error('Noise Orb shader definition is missing its main entry point.');
// Reusing the source prelude preserves the original simplex implementation and uniforms.
const rippleConstants = `
  #define MAX_RIPPLES ${VIEW.maxRipples}
  const float RIPPLE_LIFE = ${VIEW.rippleLife.toFixed(1)};
  const float RIPPLE_WAVE = ${VIEW.rippleWave.toFixed(1)};
  const float RIPPLE_SPEED = ${VIEW.rippleSpeed.toFixed(1)};
  const float RIPPLE_DECAY = ${VIEW.rippleDecay.toFixed(1)};
  const float RIPPLE_FALLOFF = ${VIEW.rippleFalloff.toFixed(1)};
  const float SWELL_WIDTH = ${VIEW.swellWidth.toFixed(1)};
  const float WAKE_WIDTH = ${VIEW.wakeWidth.toFixed(1)};
`;
export const shaderPrelude = source.slice(0, boundary);
export const vertexShader = `${shaderPrelude}\n${rippleConstants}\n${interaction}`;
export const fragmentShader = `
  varying float vLight;
  varying float vDepth;
  uniform vec3 uMint;
  uniform vec3 uWarm;
  void main() {
    float radius = length(gl_PointCoord - 0.5);
    float core = 1.0 - smoothstep(0.12, 0.5, radius);
    vec3 ink = mix(uMint, uWarm, vDepth * 0.7);
    gl_FragColor = vec4(ink, core * vLight);
  }
`;
