import { Sphere, Vector3 } from 'three';
import type { Ray } from 'three';
import { clamp } from '../config';
import type { TouchPoint } from '../score';

export function spherePoint(ray: Ray, radius: number): TouchPoint {
  const sphere = new Sphere(new Vector3(), radius), hit = ray.intersectSphere(sphere, new Vector3());
  const strength = hit ? clamp(1 - ray.distanceSqToPoint(sphere.center) / (radius * radius)) : 0;
  const position = hit ?? new Vector3();
  return { x: position.x, y: position.y, z: position.z, proximity: strength,
    nx: clamp((position.x / radius + 1) / 2), depth: clamp((1 - position.z / radius) / 2) };
}
