uniform vec4 uSculptAnchors[SCULPT_HANDLES];
uniform vec4 uSculptOffsets[SCULPT_HANDLES];
vec4 sculptSurface(vec3 point) {
  vec3 offset = vec3(0.0);
  float heat = 0.0;
  for (int i = 0; i < SCULPT_HANDLES; i++) {
    vec4 anchor = uSculptAnchors[i];
    float weight = exp(-dot(point - anchor.xyz, point - anchor.xyz) / SCULPT_WIDTH) * anchor.w;
    offset += uSculptOffsets[i].xyz * weight;
    heat += length(uSculptOffsets[i].xyz) * weight * SCULPT_HEAT;
  }
  return vec4(offset, clamp(heat, 0.0, 1.0));
}
