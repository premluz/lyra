uniform sampler2D uProfiles;
uniform vec2 uSize;
uniform float uTime;
attribute vec3 aLayer;
attribute vec3 aColour;
varying vec4 vWave;
varying vec3 vColour;
varying vec2 vScreen;

void main() {
  float phase = position.x;
  float radius = texture2D(uProfiles, vec2((phase * SEGMENTS + 0.5) / SAMPLES, (aLayer.x + 0.5) / LANES)).r;
  float progress = fract(uTime / DURATION + aLayer.y / COPIES);
  vec2 extent = uSize / min(uSize.x, uSize.y) * CENTER;
  float reach = length(extent) / INNER;
  float scale = mix(1.0, reach, progress);
  float width = WIDTH * (1.0 + WIDTH_GROWTH * progress);
  float distance = max(INNER, radius * scale + position.y * width);
  float angle = phase * TAU - HALF_PI;
  vec2 point = vec2(cos(angle), -sin(angle)) * distance;
  vScreen = point / extent;
  gl_Position = vec4(vScreen, 0.0, 1.0);
  vWave = vec4(position.y, angle, progress, aLayer.z);
  vColour = aColour;
}
