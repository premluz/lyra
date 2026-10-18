import { expect, test } from 'vitest';
import { Ray, Vector3 } from 'three';
import { spherePoint } from '../src/visual/sphere-point';
import { OrbLife } from '../src/composer/orb-life';
import { hoverVoice } from '../src/interaction/config';

for (const camera of [new Vector3(0, 0, 12), new Vector3(6, 5, 10)]) {
  test(`sphere interaction follows the visible surface from camera ${camera.toArray().join('/')}`, () => {
    const ray = new Ray(camera, camera.clone().negate().normalize()), point = spherePoint(ray, 3);
    expect(point.proximity).toBeCloseTo(1); expect(new Vector3(point.x, point.y, point.z).length()).toBeCloseTo(3);
    expect(new Vector3(point.x, point.y, point.z).dot(camera)).toBeGreaterThan(0);
    const miss = spherePoint(new Ray(camera, new Vector3(1, 1, 0).normalize()), 3);
    expect(miss.proximity).toBe(0);
  });
}
test('Alive is independent of audio; hover and press grow the local pull and leave decays it', () => {
  const life = new OrbLife(), point = { x: -1, y: 1, z: 2.5, nx: 0.3, depth: 0.4, proximity: 0.3 };
  life.setAlive(0.4); life.update(0, 1); expect(life.uniforms.uAlive.value).toBe(0.4); expect(life.uniforms.uLifeTime.value).toBe(1);
  expect(life.uniforms.uLifeState.value.toArray()).toEqual([0, 0, 0, 0]); expect(life.uniforms.uLifePoint.value.w).toBe(0);
  life.move(point, 0); life.update(1, 2); const edge = life.uniforms.uLifeState.value.x;
  life.move({ ...point, proximity: 1 }, 0); life.update(3, 2); const centre = life.uniforms.uLifeState.value.x;
  life.hold(true); life.update(5, 2); expect(life.uniforms.uLifeState.value.x).toBeGreaterThan(centre); expect(centre).toBeGreaterThan(edge);
  expect(life.uniforms.uLifePoint.value.toArray().slice(0, 3)).toEqual([point.x, point.y, point.z]);
  life.hold(false); life.leave(); life.update(7, 8);
  expect(life.uniforms.uLifePoint.value.w).toBeLessThan(0.00001); expect(life.uniforms.uLifeState.value.x).toBeLessThan(0.00001);
  expect(life.uniforms.uAlive.value).toBe(0.4); life.reset(); expect(life.uniforms.uLifeState.value.toArray()).toEqual([0, 0, 0, 0]);
  expect(() => life.setAlive(NaN)).toThrow('Alive'); expect(() => life.setAlive(2)).toThrow('Alive');
});
test('proximity independently opens the voice filter and increases volume for slow and fast gestures', () => {
  for (const speed of [0.1, 0.9]) {
    const point = { x: 0, z: 0, nx: 0.5, depth: 0.5 }, far = hoverVoice({ ...point, proximity: 0.2 }, speed), near = hoverVoice({ ...point, proximity: 1 }, speed);
    expect(near.velocity).toBeGreaterThan(far.velocity * 4); expect(near.cutoff).toBeGreaterThan(far.cutoff);
    expect(hoverVoice(point, speed).velocity).toBe(0);
  }
});
