uniform vec4 uRipples[MAX_RIPPLES];
uniform vec3 uSwell;
uniform vec3 uWake;
uniform float uEnergy;
uniform float uMotion;
uniform float uPointSize;
uniform float uPixelRatio;
varying float vLight;
varying float vDepth;
void main() {
  float time = uTime * uOrbSpeed;
  float n1 = snoise(position * uOrbFreq + time) * 0.65;
  float n2 = snoise(position * uOrbFreq * 2.03 + time * 1.3 + 11.0) * 0.35;
  vec3 pos = position + normalize(position) * (n1 + n2) * uOrbAmp * uMotion;
  float displacement = 0.0;
  float glow = 0.0;
  for (int i = 0; i < MAX_RIPPLES; i++) {
    float age = uTime - uRipples[i].z;
    if (age >= 0.0 && age < RIPPLE_LIFE) {
      float d = length(position.xz - uRipples[i].xy);
      float envelope = uRipples[i].w * exp(-RIPPLE_DECAY * age) * exp(-RIPPLE_FALLOFF * d);
      float wave = sin(RIPPLE_WAVE * d - RIPPLE_SPEED * age);
      displacement += wave * envelope;
      glow += abs(wave) * envelope;
    }
  }
  float swellDistance = length(position.xz - uSwell.xy);
  float swell = exp(-swellDistance * swellDistance / SWELL_WIDTH) * uSwell.z;
  float wakeDistance = length(position.xz - uWake.xy);
  float wake = exp(-wakeDistance * wakeDistance / WAKE_WIDTH) * uWake.z;
  pos.y += (displacement + swell + wake) * uMotion;
  vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = clamp((viewPosition.z + 16.0) / 9.0, 0.0, 1.0);
  vLight = clamp(0.35 + glow * 1.6 + swell * 0.3 + wake + uEnergy * 3.0, 0.0, 1.0);
  gl_PointSize = uPointSize * uPixelRatio * clamp(10.0 / -viewPosition.z, 0.6, 1.8);
  gl_Position = projectionMatrix * viewPosition;
}
