import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { VIEW, clamp } from '../config';
import { spherePoint } from '../visual/sphere-point';
import { SCULPT } from './config';
import type { SculptFocus, SculptHandle, SculptPoint } from './config';
import type { TouchPoint } from '../score';

export interface SculptHit { point: TouchPoint; position: SculptPoint; focus: SculptFocus; handle: number | null; hit: boolean }
export class SculptProjection {
  private camera = new PerspectiveCamera(VIEW.fov, 1, VIEW.near, VIEW.far);
  private ray = new Raycaster();
  constructor(private host: HTMLElement) {}
  private cast(x: number, y: number) {
    const rect = this.host.getBoundingClientRect();
    this.camera.position.set(VIEW.camera[0], VIEW.camera[1], rect.width < VIEW.mobileWidth ? VIEW.mobileCameraZ : VIEW.camera[2]);
    this.camera.aspect = rect.width / rect.height; this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    return this.ray.ray;
  }
  sample(x: number, y: number, handles: readonly SculptHandle[], lane: string): SculptHit {
    const ray = this.cast(x, y), point = spherePoint(ray, VIEW.interactionRadius);
    const distance = Math.sqrt(ray.distanceSqToPoint(new Vector3()));
    const proximity = Math.exp(-((Math.max(0, distance - VIEW.interactionRadius) / SCULPT.hoverRange) ** 2));
    const closest = ray.closestPointToPoint(new Vector3(), new Vector3()).normalize().multiplyScalar(VIEW.interactionRadius);
    const position = point.proximity ? new Vector3(point.x, point.y ?? 0, point.z) : closest;
    let handle: number | null = null;
    let nearest: number = SCULPT.handleRadius;
    handles.forEach((item, index) => {
      if (item.lane !== lane) return;
      const target = new Vector3(item.anchor.x + item.offset.x, item.anchor.y + item.offset.y, item.anchor.z + item.offset.z);
      const separation = Math.sqrt(ray.distanceSqToPoint(target));
      if (separation < nearest) { nearest = separation; handle = index; position.copy(target); }
    });
    return { point: { ...point, x: position.x, y: position.y, z: position.z, proximity }, position, handle,
      hit: distance <= VIEW.interactionRadius || handle !== null,
      focus: { proximity, height: clamp(position.y / VIEW.interactionRadius, -1, 1) / 2, depth: clamp((position.z / VIEW.interactionRadius + 1) / 2) / 2 } };
  }
  delta(x: number, y: number, startX: number, startY: number, position: SculptPoint): SculptPoint {
    const normal = this.camera.getWorldDirection(new Vector3());
    const plane = new Plane().setFromNormalAndCoplanarPoint(normal, new Vector3(position.x, position.y, position.z));
    const start = this.cast(startX, startY).intersectPlane(plane, new Vector3());
    const end = this.cast(x, y).intersectPlane(plane, new Vector3());
    if (!start || !end) throw new Error('Cannot project this sculpt gesture onto the orb.');
    return end.sub(start);
  }
}
