import { PerspectiveCamera, Plane, Points, Raycaster, Vector2, Vector3 } from 'three';
import { ENGINE } from './constants';
import { setNumber } from './apply';
import type { Uniforms } from './material';

export class PointerField {
  private target = new Vector2();
  private current = new Vector2();
  private trail = new Vector2();
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 0, 1), 0);
  private hit = new Vector3();
  private presence = 0;
  private trailAmount = 0;
  private speed = 0;
  private charge = 0;
  private previousTime = performance.now();
  private controller = new AbortController();

  constructor(container: HTMLElement, private points: Points, private camera: PerspectiveCamera, private uniforms: Uniforms) {
    const options = { signal: this.controller.signal };
    container.addEventListener('pointermove', (event) => {
      const rect = container.getBoundingClientRect();
      const next = new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      const now = performance.now(), delta = Math.max(now - this.previousTime, 1) / ENGINE.milliseconds;
      this.speed = next.distanceTo(this.target) / delta;
      this.previousTime = now;
      this.target.copy(next); this.presence = 1;
    }, options);
    container.addEventListener('pointerleave', () => { this.presence = 0; }, options);
    container.addEventListener('pointerdown', () => {
      const click = uniforms.uClickPos.value;
      if (click instanceof Vector2) click.copy(this.current).multiplyScalar(ENGINE.gridMouseScale);
      const time = uniforms.uTime.value;
      if (typeof time === 'number') setNumber(uniforms, 'uClickTime', time);
    }, options);
  }

  update() {
    this.current.lerp(this.target, ENGINE.pointerEase);
    this.speed *= ENGINE.speedDecay;
    const targetCharge = this.presence * Math.max(0, 1 - this.speed / ENGINE.pointerSpeedRef);
    this.charge += (targetCharge - this.charge) * (targetCharge > this.charge ? ENGINE.chargeRate : ENGINE.dischargeRate);
    this.trail.lerp(this.current, ENGINE.trailEase);
    this.trailAmount = Math.max(this.charge, this.trailAmount * ENGINE.trailDecay);
    this.points.updateMatrixWorld(); this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.current, this.camera);
    if (this.ray.ray.intersectPlane(this.plane, this.hit)) this.points.worldToLocal(this.hit);
    this.vector('uMouseWorld', this.hit.x, -this.hit.y);
    this.vector('uPointerWorld', this.hit.x, this.hit.y);
    this.vector('uPointerScreen', this.current.x, this.current.y);
    this.vector('uPointerTrailScreen', this.trail.x, this.trail.y);
    this.vector('uPointerTrailCentre', this.hit.x, this.hit.y);
    setNumber(this.uniforms, 'uPointerPresence', this.charge);
    setNumber(this.uniforms, 'uPointerTrailAmount', this.trailAmount);
  }
  private vector(name: string, x: number, y: number) {
    const value = this.uniforms[name].value;
    if (value instanceof Vector2) value.set(x, y);
  }
  dispose() { this.controller.abort(); }
}
