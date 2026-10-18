vec3 p1 = vec3(a0.zw, h.y);
vec3 p2 = vec3(a1.xy, h.z);
vec3 p3 = vec3(a1.zw, h.w);
vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
m = m * m;
return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
void main() {
vec3 baseColor = color;
vec3 basePos = mix(position, aTargetPos, uMorphProgress);
float baseSize = mix(size, aTargetSize, uMorphProgress);
float blendedHelixPhi = mix(helixPhi, aTargetHelixPhi, uMorphProgress);
float blendedRibbonProgress = mix(max(aRibbonProgress, 0.0), max(aTargetRibbonProgress, 0.0), uMorphProgress);
float ribbonStyleAmount = uHeroRibbonProgress * mix(step(0.0, aRibbonProgress), step(0.0, aTargetRibbonProgress), uMorphProgress);
float fromRadialAlpha = 1.0 - uRadialFadeFrom * smoothstep(0.0, max(uRadialFadeRadius, 0.001), length(position.xy));
float toRadialAlpha = 1.0 - uRadialFadeTo * smoothstep(0.0, max(uRadialFadeRadius, 0.001), length(aTargetPos.xy));
vRadialAlpha = mix(fromRadialAlpha, toRadialAlpha, uMorphProgress);
float entranceHash = fract(sin(dot(basePos.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
float startAt = entranceHash * (1.0 - 0.35);
vEntranceAlpha = clamp((uEntrance - startAt) / 0.35, 0.0, 1.0);
vec3 pos = basePos;
float styleSizeMul = 1.0;
float orbNoise = 0.0;
{
float _amount = uOrbAmp * uLabProgress;
if (_amount > 0.0001) {
float n1 = snoise(basePos * uOrbFreq + uTime * uOrbSpeed) * 0.65;
float n2 = snoise(basePos * uOrbFreq * 2.03 + uTime * uOrbSpeed * 1.3 + 11.0) * 0.35;
orbNoise = n1 + n2;
vec3 dir = normalize(basePos);
pos = basePos + dir * orbNoise * _amount;
}
}
{
float _amount = uTerrainAmp * uTerrainProgress;
if (_amount > 0.0001) {
float tn1 = snoise(vec3(basePos.x, basePos.z, uTime * uTerrainSpeed) * uTerrainFreq) * 0.7;
float tn2 = snoise(vec3(basePos.x, basePos.z, uTime * uTerrainSpeed * 0.6 + 31.0) * uTerrainFreq * 2.1) * 0.3;
pos.y += (tn1 + tn2) * _amount;
}
}
{
float _amount = uVolatilityAmp * uVolatilityProgress;
if (_amount > 0.0001) {
float vn1 = snoise(vec3(basePos.x, basePos.z, uTime * uVolatilitySpeed) * uVolatilityFreq) * 0.7;
float vn2 = snoise(vec3(basePos.x, basePos.z, uTime * uVolatilitySpeed * 0.6 + 31.0) * uVolatilityFreq * 2.1) * 0.3;
pos.y += (vn1 + vn2) * _amount;
}
}
{
float _amount = uHelixProgress;
if (_amount > 0.0001) {
float ringCenterX = basePos.x - uHelixTubeRadius * cos(blendedHelixPhi);
float ringCenterZ = basePos.z - uHelixTubeRadius * sin(blendedHelixPhi);
float wave = sin(blendedHelixPhi * uHelixWaveFreq + uTime * uHelixWaveSpeed) * uHelixWaveAmp;
float animatedPhi = blendedHelixPhi + wave * _amount;
pos.x = ringCenterX + uHelixTubeRadius * cos(animatedPhi);
pos.z = ringCenterZ + uHelixTubeRadius * sin(animatedPhi);
}
}
{
float _amount = uGridProgress;
if (_amount > 0.0001) {
vec2 toMouse = basePos.xz - uMouseWorld;
float mouseDist = length(toMouse);
float mouseWaveNoise = snoise(vec3(basePos.xz * 0.35, uTime * 0.12)) * 2.5;
float mouseWave = sin(mouseDist * uGridWaveFreq - uTime * uGridWaveSpeed + mouseWaveNoise)
* exp(-mouseDist * uGridWaveFalloff);
pos.y += mouseWave * uGridWaveAmp * uGridProgress;
float tSinceClick = uTime - uClickTime;
if (tSinceClick >= 0.0 && tSinceClick < uGridRippleLife) {
vec2 toClick = basePos.xz - uClickPos;
float clickDist = length(toClick);
float clickAngle = atan(toClick.y, toClick.x);
float radiusNoise = snoise(vec3(cos(clickAngle) * 2.0, sin(clickAngle) * 2.0, uTime * 0.2))
* uGridRippleWidth * 0.8;
float rippleRadius = tSinceClick * uGridRippleSpeed + radiusNoise;
float ring = exp(-pow((clickDist - rippleRadius) / uGridRippleWidth, 2.0));
float decay = 1.0 - (tSinceClick / uGridRippleLife);
pos.y += ring * decay * uGridRippleAmp * uGridProgress;
}
}
}
{
float _amount = uIdleDriftAmount;
if (_amount > 0.0001) {
float iw1 = idleHash(aRoleHash, 11.0);
float iw2 = idleHash(aRoleHash, 22.0);
float iw3 = idleHash(aRoleHash, 33.0);
float idleRate = uIdleWobbleSpeed * (0.6 + 0.8 * iw1);
vec3 idleWobble = vec3(
sin(uTime * idleRate + iw1 * 6.2831853),
sin(uTime * idleRate * 1.13 + iw2 * 6.2831853),
sin(uTime * idleRate * 0.87 + iw3 * 6.2831853)
) * uIdleWobbleAmp;
vec3 idleRock = vec3(
sin(uTime * uIdleRockSpeed),
sin(uTime * uIdleRockSpeed * 0.73 + 1.7) * 0.5,
cos(uTime * uIdleRockSpeed * 0.61 + 0.4) * 0.7
) * uIdleRockAmp;
pos += (idleWobble + idleRock) * uIdleDriftAmount;
}
}
{
float _amount = uPointerAmount * uPointerPresence;
if (_amount > 0.0001) {
float ptActive = uPointerAmount * uPointerPresence;
vec4 ptClip = projectionMatrix * modelViewMatrix * vec4(basePos, 1.0);
vec2 ptScreen = ptClip.xy / max(abs(ptClip.w), 0.0001);
ptScreen.x *= uPointerAspect;
vec2 ptCursor = uPointerScreen;
ptCursor.x *= uPointerAspect;
float ptDist = length(ptScreen - ptCursor);
float ptDepthW = mix(1.0, uPointerDepth,
clamp(abs(basePos.z) / max(uPointerDepthRange, 0.001), 0.0, 1.0));
vec2 ptDir = (basePos.xy - uPointerWorld) /
max(length(basePos.xy - uPointerWorld), 0.0001);
float ptH1 = ptrHash(aRoleHash, 41.0);
float ptH2 = ptrHash(aRoleHash, 57.0);
float ptR = uPointerRadius * (0.55 + 0.45 * ptH1);
float ptFallRaw = 1.0 - smoothstep(0.0, ptR, ptDist);
float ptFall = ptFallRaw * ptFallRaw;
float ptGate = ptH2 * 0.35;
float ptResp = max(ptFall - ptGate, 0.0) / max(1.0 - ptGate, 0.001)
* ptDepthW;
float ptRipple = 0.55 + 0.45 * sin(ptDist * uPointerRippleFreq
- uTime * uPointerRippleSpeed);
vec2 ptTrailCursor = uPointerTrailScreen;
ptTrailCursor.x *= uPointerAspect;
float ptTrailDist = length(ptScreen - ptTrailCursor);
float ptTrailFall = 1.0 - smoothstep(0.0, ptR, ptTrailDist);
ptTrailFall = ptTrailFall * ptTrailFall;
float ptTrail = max(ptTrailFall - ptGate, 0.0)
/ max(1.0 - ptGate, 0.001) * uPointerTrailAmount * ptDepthW;
vec2 ptTrailDir = (basePos.xy - uPointerTrailCentre) /
max(length(basePos.xy - uPointerTrailCentre), 0.0001);
float ptLive = ptResp * ptRipple * ptActive;
pos.xy += ptDir * ptLive * uPointerPush;
pos.xy += ptTrailDir * ptTrail * uPointerPush * uPointerTrailGain;
pos.z += sign(basePos.z) * uPointerPush * 0.45
* (ptLive + ptTrail * uPointerTrailGain);
float ptLean = ptResp * uPointerTilt * ptActive
* (basePos.z / max(uPointerRadius, 0.001));
pos.xy -= ptDir * ptLean;
}
}
{
float _amount = uFreeFloatRatio;
if (_amount > 0.0001) {
if (aRoleHash < uFreeFloatRatio) {
