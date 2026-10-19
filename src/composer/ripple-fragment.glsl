uniform float uTime;
uniform float uGain;
varying vec4 vWave;
varying vec3 vColour;
varying vec2 vScreen;

void main() {
  float angle = vWave.y;
  float drift = uTime * DRIFT;
  float fold = sin(angle * FOLDS - drift);
  float petal = 0.5 + 0.5 * sin(angle * PETALS + fold * WARP + drift);
  float body = exp(-BODY * vWave.x * vWave.x);
  float rim = exp(-RIM * vWave.x * vWave.x);
  float light = LIGHT_FLOOR + LIGHT_RANGE * petal * petal;
  vec3 colour = mix(vColour, vColour.bgr, TINT * (0.5 + 0.5 * fold));
  float travel = pow(sin(vWave.z * PI), 2.0);
  float border = 1.0 - smoothstep(CLIP_START, CLIP_END, max(abs(vScreen.x), abs(vScreen.y)));
  float softEdge = 1.0 - smoothstep(EDGE_START, EDGE_END, abs(vWave.x));
  float alpha = (body * light + rim * RIM_GAIN) * travel * OPACITY * uGain * (1.0 + vWave.w * BOOST);
  gl_FragColor = vec4(colour, alpha * border * softEdge);
  #include <colorspace_fragment>
}
