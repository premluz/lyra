float h1 = freeHash(aRoleHash, 1.0);
float h2 = freeHash(aRoleHash, 2.0);
float h3 = freeHash(aRoleHash, 3.0);
float theta = h1 * 6.2831853;
float phi = acos(2.0 * h2 - 1.0);
float r = uFreeFloatRadius * (0.45 + 0.55 * h3);
vec3 home = vec3(
r * sin(phi) * cos(theta),
r * cos(phi) * 0.55,
r * sin(phi) * sin(theta)
);
vec3 drift = vec3(
sin(uTime * uFreeFloatSpeed * (0.7 + h1) + h1 * 6.28),
sin(uTime * uFreeFloatSpeed * (0.9 + h2) + h2 * 6.28),
sin(uTime * uFreeFloatSpeed * (1.1 + h3) + h3 * 6.28)
) * uFreeFloatDrift;
pos = home + drift;
}
}
}
if (ribbonStyleAmount > 0.0001) {
float pcSize = fract(uTime / uPulseCycleS);
float climbFadeSize = 1.0 - smoothstep(uPulseFadeStart, 1.0, pcSize);
float breatheSize = 1.0 - uPulseBreatheDepth * 0.5 * (1.0 - sin(uTime * uPulseBreatheHz * 6.28318));
float piSize = climbFadeSize * breatheSize;
float dSize = blendedRibbonProgress - pcSize;
float wSize = dSize >= 0.0 ? uPulseBandWidth : (uPulseBandWidth * uPulseTailStretch);
float bandSize = exp(-(dSize * dSize) / (2.0 * wSize * wSize));
float amtSize = bandSize * piSize * ribbonStyleAmount;
styleSizeMul *= 1.0 + amtSize * 0.6;
}
float ptActiveSz = uPointerAmount * uPointerPresence;
vec4 ptClipSz = projectionMatrix * modelViewMatrix * vec4(basePos, 1.0);
vec2 ptScreenSz = ptClipSz.xy / max(abs(ptClipSz.w), 0.0001);
ptScreenSz.x *= uPointerAspect;
vec2 ptCursorSz = uPointerScreen;
ptCursorSz.x *= uPointerAspect;
float ptDistSz = length(ptScreenSz - ptCursorSz);
float ptDepthWSz = mix(1.0, uPointerDepth,
clamp(abs(basePos.z) / max(uPointerDepthRange, 0.001), 0.0, 1.0));
float ptRSz = uPointerRadius * (0.55 + 0.45 * ptrHash(aRoleHash, 41.0));
float ptFallSz = 1.0 - smoothstep(0.0, ptRSz, ptDistSz);
ptFallSz = ptFallSz * ptFallSz;
float ptGateSz = ptrHash(aRoleHash, 57.0) * 0.35;
vPointerNear = (max(ptFallSz - ptGateSz, 0.0)
/ max(1.0 - ptGateSz, 0.001)) * ptActiveSz * ptDepthWSz;
styleSizeMul *= 1.0 + vPointerNear * uPointerSizeGain;
if (aRoleHash < uFreeFloatRatio) styleSizeMul *= uFreeFloatSizeMul;
float waveDistance = basePos.y - uWavefront;
if (uPrefersReducedMotion) {
baseColor = mix(color, uWaveColor, 0.8);
} else {
float waveMix = smoothstep(-uWaveFalloff, uWaveFalloff, waveDistance);
baseColor = mix(color, uWaveColor, waveMix * 0.95);
}
baseColor = mix(baseColor, uWaveColor, abs(orbNoise) * uLabProgress * 0.6);
if (ribbonStyleAmount > 0.0001) {
float pulseCenter = fract(uTime / uPulseCycleS);
float climbFade = 1.0 - smoothstep(uPulseFadeStart, 1.0, pulseCenter);
float breathe = 1.0 - uPulseBreatheDepth * 0.5 * (1.0 - sin(uTime * uPulseBreatheHz * 6.28318));
float pulseIntensity = climbFade * breathe;
float d = blendedRibbonProgress - pulseCenter;
float widthAhead = uPulseBandWidth;
float widthBehind = uPulseBandWidth * uPulseTailStretch;
float sideWidth = d >= 0.0 ? widthAhead : widthBehind;
float band = exp(-(d * d) / (2.0 * sideWidth * sideWidth));
float amt = band * pulseIntensity * ribbonStyleAmount;
vec3 pulseTone = mix(uPulseColorEdge, uPulseColor, clamp(amt, 0.0, 1.0));
vec3 hotMix = mix(pulseTone, uPulseHot, clamp((amt - 0.6) / 0.4, 0.0, 1.0));
float afterglowAmt = d < 0.0 ? (1.0 - clamp(amt * 3.0, 0.0, 1.0)) * exp(-(d * d) / (2.0 * widthBehind * widthBehind * 4.0)) * pulseIntensity * ribbonStyleAmount : 0.0;
baseColor = mix(baseColor, uPulseAfterglow, afterglowAmt * 0.5);
baseColor = mix(baseColor, hotMix, clamp(amt, 0.0, 1.0));
}
if (uHalftoneProgress > 0.0001) {
baseColor = mix(baseColor, uHalftoneInk, uHalftoneProgress);
}
vColor = baseColor;
vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
gl_PointSize = (0.09 * baseSize * sizeScale * styleSizeMul) * (300.0 / -mvPosition.z) * uDprNorm * uSpriteScale;
if (uHalftoneProgress > 0.0001) {
float depth = clamp((-mvPosition.z - uHalftoneNear)
/ max(uHalftoneFar - uHalftoneNear, 0.001), 0.0, 1.0);
float htSize = mix(uHalftoneSizeNear, uHalftoneSizeFar, depth) * (uDprNorm * 2.0);
gl_PointSize = mix(gl_PointSize, htSize, uHalftoneProgress);
vHalftoneAlpha = mix(uHalftoneAlphaNear, uHalftoneAlphaFar, depth);
vec4 clip = projectionMatrix * mvPosition;
float ndcX = clip.x / max(abs(clip.w), 0.0001);
float colMix = smoothstep(uHalftoneMaskFrom, uHalftoneMaskTo, ndcX * 0.5 + 0.5);
vHalftoneAlpha = mix(vHalftoneAlpha, min(vHalftoneAlpha, uHalftoneMaskAlpha), colMix);
}
gl_Position = projectionMatrix * mvPosition;
}