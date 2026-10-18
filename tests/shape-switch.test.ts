import { expect, test } from 'vitest';
import { Ray, Vector3 } from 'three';
import { VIEW } from '../src/config';
import { SURFACE, wavePositions, wavePoint, isMusicShape } from '../src/visual/surface';
import { spherePoint } from '../src/visual/sphere-point';
import { compositionFixture } from './composition-fixtures';
import { MusicVisual } from '../src/composer/music-visual';
import { ScorePlayback } from '../src/composer/playback';
import { createSetup } from '../src/composer/setup';

for (const count of [VIEW.desktopCount, VIEW.mobileCount]) {
  test(`the extracted waves grid supplies ${count} finite points on the ground plane`, () => {
    const positions = wavePositions(count); expect(positions).toHaveLength(count * 3);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let index = 0; index < count; index++) {
      expect(positions[index * 3 + 1]).toBe(0); expect(Number.isFinite(positions[index * 3])).toBe(true);
      minX = Math.min(minX, positions[index * 3]); maxX = Math.max(maxX, positions[index * 3]);
      minZ = Math.min(minZ, positions[index * 3 + 2]); maxZ = Math.max(maxZ, positions[index * 3 + 2]);
    }
    expect(maxX - minX).toBeGreaterThan(SURFACE.size); expect(maxZ - minZ).toBeGreaterThan(SURFACE.size * 0.9);
  });
}
test('waves pointer rays land on the plane, and distant or backward rays cannot heat the surface', () => {
  const origin = new Vector3(...VIEW.camera), ray = new Ray(origin, origin.clone().negate().normalize());
  expect(wavePoint(ray)).toMatchObject({ y: 0, nx: 0.5, depth: 0.5, proximity: 1 });
  expect(spherePoint(ray, VIEW.interactionRadius).y).toBeGreaterThan(0);
  const outside = new Ray(origin, new Vector3(100, 0, 0).sub(origin).normalize());
  expect(wavePoint(outside).proximity).toBe(0); expect(wavePoint(new Ray(origin, new Vector3(0, 1, 0))).proximity).toBe(0);
});
for (const variant of ['trio', 'custom-polyphony'] as const) {
  test(`${variant} switches rendering uniforms without changing its tune and exports the chosen shape`, () => {
    const score = compositionFixture(variant), before = structuredClone(score.state), visual = new MusicVisual(score, new ScorePlayback(score));
    expect(visual.shape).toBe('orb'); visual.setShape('waves'); expect(visual.uniforms.uMusicWaves.value).toBe(1);
    expect(createSetup(score.state, { treatment: 'glow', alive: 0.25, shape: visual.shape }).visuals.shape).toBe('waves');
    visual.setShape('orb'); expect(visual.uniforms.uMusicWaves.value).toBe(0); expect(score.state).toEqual(before);
    expect(isMusicShape('waves')).toBe(true); expect(isMusicShape('not-a-shape')).toBe(false); visual.dispose();
  });
}
