uniform sampler2D uMusicProfiles;
uniform vec4 uMusicLanes[MUSIC_LANES];
uniform vec4 uMusicPulses[MUSIC_LANES];
uniform vec4 uMusicSpectrum;
uniform float uMusicPlayhead;
uniform float uMusicPositions[MUSIC_LANES];
uniform float uMusicWaves;
uniform float uMusicWaveSize;
attribute vec3 aWavePosition;
uniform float uMotion;
uniform float uPointSize;
uniform float uPixelRatio;
varying float vMusicLight;
varying float vMusicPitch;
varying float vMusicCrest;
varying float vMusicDepth;

vec3 musicSurface(vec3 normal, vec3 point) {
  float longitude = atan(normal.z, normal.x) / MUSIC_TAU + 0.5;
  float latitude = asin(clamp(normal.y, -1.0, 1.0));
  if (uMusicWaves > 0.5) {
    longitude = clamp(point.x / uMusicWaveSize + 0.5, 0.0, 1.0);
    latitude = point.z / uMusicWaveSize * MUSIC_TAU * 0.5;
  }
  float displacement = 0.0;
  float light = 0.0;
  float pitch = 0.0;
  for (int i = 0; i < MUSIC_LANES; i++) {
    vec4 lane = uMusicLanes[i], pulse = uMusicPulses[i];
    if (lane.x == 0.0 && pulse.x == 0.0) continue;
    float angle = lane.w;
    float belt = exp(-pow((latitude - sin(angle) * MUSIC_BAND) / MUSIC_BAND, 2.0));
    float phase = fract(longitude + angle / MUSIC_TAU);
    float profile = texture2D(uMusicProfiles, vec2(phase, (float(i) + 0.5) / float(MUSIC_LANES))).r;
    float distance = min(abs(phase - pulse.z), 1.0 - abs(phase - pulse.z));
    float ridge = sin(distance * MUSIC_TAU * (MUSIC_RIDGE_MIN + pulse.y * MUSIC_RIDGE_RANGE) - pulse.w * MUSIC_RING_SPEED);
    float playing = texture2D(uMusicProfiles, vec2(fract(phase + uMusicPositions[i]), (float(i) + 0.5) / float(MUSIC_LANES))).r;
    displacement += belt * (profile * lane.x * MUSIC_PROFILE_DEPTH + pulse.x * MUSIC_PULSE_DEPTH * (ridge * MUSIC_RIDGE_MIX + playing));
    float contribution = belt * pulse.x * (0.5 + 0.5 * ridge);
    light += contribution; pitch += contribution * pulse.y;
  }
  return vec3(clamp(displacement, -MUSIC_MAX_MORPH, MUSIC_MAX_MORPH), light, pitch / max(light, 0.001));
}
void main() {
  vec3 point = position, normal = normalize(position);
  if (uMusicWaves > 0.5) { point = aWavePosition; normal = vec3(0.0, 1.0, 0.0); }
  vec3 field = musicSurface(normal, point);
  vec3 noisePoint = uMusicWaves > 0.5 ? point / uMusicWaveSize * MUSIC_TAU : normal;
  float energy = uMusicSpectrum.x;
  float noise = snoise(noisePoint * uOrbFreq * MUSIC_NOISE_FREQUENCY + uTime * uOrbSpeed) * uOrbAmp * energy * MUSIC_NOISE_DEPTH;
  float breath = sin(noisePoint.y * MUSIC_BASS_FREQUENCY + noisePoint.z * uMusicWaves + uMusicPlayhead * MUSIC_TAU) * uMusicSpectrum.y * MUSIC_BASS_DEPTH;
  vec3 pos = point + normal * (field.x + noise + breath) * uMotion;
  pos += livingSurface(point, normal) * uMotion;
  #ifdef SCULPT_DEMO
  vec4 sculpture = sculptSurface(point);
  pos += sculpture.xyz * uMotion;
  vLifeHeat = max(vLifeHeat, sculpture.w);
  #endif
  #ifdef AURA_DEMO
  vec4 aura = auraSurface(point, normal, pos - point, uMotion);
  pos = aura.xyz;
  vLifeHeat = max(vLifeHeat, aura.w);
  #endif
  pos.xz += vec2(normal.z, -normal.x) * field.y * MUSIC_TWIST_DEPTH * uMotion;
  vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
  vMusicDepth = clamp((-viewPosition.z - uHalftoneNear) / (uHalftoneFar - uHalftoneNear), 0.0, 1.0);
  vMusicLight = MUSIC_REST_LIGHT + min(1.0, field.y + energy) * MUSIC_ACTIVE_LIGHT;
  float colourHeight = uMusicWaves > 0.5 ? noisePoint.z / MUSIC_TAU : normal.y;
  vMusicPitch = clamp(field.z * MUSIC_PITCH_MIX + colourHeight * MUSIC_LATITUDE_COLOUR + MUSIC_LATITUDE_COLOUR + uMusicSpectrum.w * MUSIC_SPECTRUM_COLOUR, 0.0, 1.0);
  vMusicCrest = clamp(abs(field.x) * MUSIC_CREST_MIX + field.y * MUSIC_CREST_MIX + uMusicSpectrum.z * MUSIC_SPECTRUM_COLOUR, 0.0, 1.0);
  float size = mix(uPointSize, mix(uHalftoneSizeNear, uHalftoneSizeFar, vMusicDepth), uHalftoneProgress);
  gl_PointSize = size * uPixelRatio * clamp(MUSIC_VIEW_SCALE / -viewPosition.z, MUSIC_SIZE_MIN, MUSIC_SIZE_MAX);
  gl_Position = projectionMatrix * viewPosition;
}
