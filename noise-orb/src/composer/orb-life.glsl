uniform vec4 uLifePoint;
uniform vec4 uLifeState;
uniform float uAlive;
uniform float uLifeTime;
varying float vLifeHeat;

float livingWave(vec3 point) {
  float time = uLifeTime * LIFE_IDLE_SPEED;
  float distance = length(point.xz);
  float phaseNoise = snoise(vec3(point.xz * LIFE_WAVE_NOISE_FREQUENCY, time * LIFE_WAVE_NOISE_SPEED)) * LIFE_WAVE_NOISE_DEPTH;
  float wave = sin(distance * uGridWaveFreq - time * uGridWaveSpeed + phaseNoise);
  return wave * exp(-distance * uGridWaveFalloff) * uAlive * LIFE_IDLE_DEPTH;
}

vec3 livingSurface(vec3 point, vec3 normal) {
  float base = livingWave(point);
  float distance = length(point - uLifePoint.xyz);
  float influence = exp(-distance * distance / (LIFE_WIDTH * LIFE_WIDTH));
  float turbulence = snoise(point * LIFE_LOCAL_FREQUENCY + uLifeTime * LIFE_LOCAL_SPEED);
  float pull = influence * uLifeState.x * (1.0 + turbulence * 0.5);
  float tap = influence * uLifeState.w;
  vLifeHeat = clamp((abs(pull) + tap) * LIFE_HEAT, 0.0, 1.0);
  return normal * (base + pull + tap);
}
