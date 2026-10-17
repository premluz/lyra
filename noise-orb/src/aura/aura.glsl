uniform float uAuraTime;
uniform float uAuraAudio;
uniform float uAuraPhase;
uniform float uAuraForm;
uniform vec4 uAuraGesture;
uniform vec4 uAuraPointer;
uniform vec4 uAuraNotes[AURA_PULSES];

vec4 auraSurface(vec3 point, vec3 normal, vec3 music, float motion) {
  float time = uAuraTime * motion;
  float angle = atan(normal.z, normal.x) + time * AURA_ROTATION + uAuraPhase;
  float latitude = normal.y;
  float fold = sin(latitude * AURA_LATITUDE_FOLD + angle * AURA_ANGLE_FOLD + time * AURA_DRIFT + (uAuraGesture.x - 0.5) * uAuraPointer.w * AURA_PARALLAX);
  float radius = AURA_RADIUS + fold * AURA_FOLD;
  vec3 torus = vec3(cos(angle) * radius, sin(latitude * AURA_LATITUDE_WAVE) * AURA_TORUS_HEIGHT + sin(angle * 2.0 + time * AURA_DRIFT) * AURA_TORUS_TWIST, sin(angle) * radius);
  float circle = sqrt(max(0.0, 1.0 - latitude * latitude));
  vec3 shell = vec3(cos(angle) * circle * AURA_RADIUS, latitude * AURA_SHELL_HEIGHT, sin(angle) * circle * AURA_RADIUS);
  float ribbonRadius = AURA_RADIUS + latitude * AURA_RIBBON_WIDTH;
  vec3 ribbon = vec3(cos(angle) * ribbonRadius, latitude * AURA_RIBBON_HEIGHT + sin(angle * 3.0 + time * AURA_DRIFT) * AURA_FOLD, sin(angle) * ribbonRadius);
  vec3 pos = mix(torus, shell, clamp(uAuraForm, 0.0, 1.0));
  pos = mix(pos, ribbon, clamp(uAuraForm - 1.0, 0.0, 1.0));
  pos += music * AURA_MUSIC_DEPTH;
  vec3 pull = uAuraPointer.xyz - pos;
  float influence = exp(-dot(pull, pull) / AURA_POINTER_WIDTH) * uAuraPointer.w;
  pos += (pull * (AURA_POINTER_PULL + uAuraGesture.z * AURA_CHARGE_PULL) + cross(normal, pull) * (uAuraGesture.z + uAuraGesture.y * AURA_SPEED_SWIRL) * AURA_SWIRL) * influence * motion;
  float petals = sin(angle * AURA_PETALS + time * AURA_DRIFT);
  pos += normal * uAuraGesture.w * (1.0 + petals) * AURA_BLOOM_SIZE * motion;
  float light = influence * (AURA_HOVER_HEAT + uAuraGesture.z * AURA_HEAT + uAuraGesture.y * AURA_SPEED_HEAT);
  for (int i = 0; i < AURA_PULSES; i++) {
    vec4 note = uAuraNotes[i];
    float age = uAuraAudio - note.z;
    if (note.w == 0.0 || age < 0.0) continue;
    vec3 center = normalize(vec3(cos(note.x), note.y - 0.5, sin(note.x)));
    float distance = length(normal - center);
    float envelope = exp(-age / AURA_PULSE_DECAY) * note.w;
    float wave = sin(distance * AURA_PULSE_WAVES - age * AURA_PULSE_SPEED);
    pos += normal * wave * envelope * AURA_PULSE_DEPTH * motion;
    light += envelope * (0.5 + 0.5 * wave) * AURA_PULSE_HEAT;
  }
  return vec4(pos, clamp(light, 0.0, 1.0));
}
