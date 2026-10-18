uniform vec3 uPulseColor;
uniform vec3 uPulseColorEdge;
uniform vec3 uPulseHot;
uniform vec3 uPulseAfterglow;
uniform float uHalftoneProgress;
uniform float uHalftoneAlphaNear;
uniform float uHalftoneAlphaFar;
varying float vMusicLight;
varying float vMusicPitch;
varying float vMusicCrest;
varying float vMusicDepth;
varying float vLifeHeat;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float radius = length(p);
  float angle = atan(p.y, p.x), slice = MUSIC_TAU / 6.0;
  float hexagon = radius * cos(mod(angle, slice) - slice * 0.5);
  float glow = 1.0 - smoothstep(MUSIC_GLOW_INNER, 0.5, hexagon);
  float disc = 1.0 - smoothstep(MUSIC_INK_EDGE, 0.5, radius);
  vec3 ink = mix(uPulseColor, uPulseColorEdge, vMusicPitch);
  ink = mix(ink, uPulseHot, vMusicCrest * MUSIC_HOT_MIX);
  ink = mix(ink, uPulseAfterglow, pow(vMusicCrest, MUSIC_AFTERGLOW_POWER) * MUSIC_AFTERGLOW_MIX);
  ink = mix(ink, uPulseHot, vLifeHeat);
  ink = mix(ink, uPulseAfterglow, pow(vLifeHeat, LIFE_WHITE_POWER));
  float alpha = mix(glow, disc * mix(uHalftoneAlphaNear, uHalftoneAlphaFar, vMusicDepth), uHalftoneProgress);
  gl_FragColor = vec4(ink * MUSIC_BRIGHTNESS, alpha * min(1.0, vMusicLight + vLifeHeat));
  #include <colorspace_fragment>
}
