import { GESTURE, clamp } from './config';
import type { TouchPoint } from './score';

interface GestureActions {
  point: (x: number, y: number) => TouchPoint;
  start: () => void;
  note: (point: TouchPoint, velocity: number, tap: boolean) => void;
  move: (point: TouchPoint, speed: number) => void;
  drag: (point: TouchPoint, velocity: number, amount: number) => void;
  release: () => void;
  press?: (point: TouchPoint) => void;
  leave?: () => void;
}
export class Gestures {
  private abort = new AbortController();
  private pressed: number | null = null;
  private origin = { x: 0, y: 0 };
  private previous = { x: 0, y: 0, time: 0 };
  private dragging = false;
  private keyboard = { x: 0.5, y: 0.5 };

  constructor(private host: HTMLElement, private actions: GestureActions) {
    const options = { signal: this.abort.signal };
    host.addEventListener('pointerdown', (event) => this.down(event), options);
    host.addEventListener('pointermove', (event) => this.move(event), options);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(type, (event) => {
      if (event instanceof PointerEvent && event.pointerId === this.pressed) {
        this.release(); if (event.pointerType !== 'mouse' || type === 'pointercancel') this.actions.leave?.();
      }
    }, options);
    host.addEventListener('pointerleave', () => { if (this.pressed === null) { this.previous.time = 0; this.actions.leave?.(); } }, options);
    host.addEventListener('keydown', (event) => this.key(event), options);
    host.addEventListener('keyup', (event) => { if (['Shift', ' ', 'Enter'].includes(event.key)) this.release(); }, options);
    host.addEventListener('blur', () => this.leave(), options);
  }

  private down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || this.pressed !== null) return;
    event.preventDefault(); this.host.focus({ preventScroll: true });
    this.pressed = event.pointerId; this.origin = { x: event.clientX, y: event.clientY };
    this.previous = { ...this.origin, time: event.timeStamp };
    this.host.setPointerCapture(event.pointerId);
    const point = this.actions.point(event.clientX, event.clientY);
    this.actions.note(point, GESTURE.tapVelocity, true); this.actions.move(point, GESTURE.tapWake); this.actions.start();
    this.actions.press?.(point);
  }

  private move(event: PointerEvent) {
    if (!event.isPrimary || (this.pressed !== null && event.pointerId !== this.pressed)) return;
    if (event.pointerType !== 'mouse' && this.pressed === null) return;
    const elapsed = event.timeStamp - this.previous.time;
    const distance = Math.hypot(event.clientX - this.previous.x, event.clientY - this.previous.y);
    const speed = this.previous.time && elapsed > 0 ? clamp(distance / elapsed / GESTURE.hoverSpeed) : 0;
    const point = this.actions.point(event.clientX, event.clientY);
    this.previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.actions.move(point, speed);
    if (this.pressed !== null) {
      this.dragging ||= Math.hypot(event.clientX - this.origin.x, event.clientY - this.origin.y) > GESTURE.dragPixels;
      if (this.dragging) this.actions.drag(point, Math.max(GESTURE.dragMinimum, speed), Math.max(GESTURE.swellMinimum, speed));
    } else if (speed > 0) this.actions.note(point, GESTURE.volumeMin + speed * (GESTURE.volumeMax - GESTURE.volumeMin), false);
  }

  private key(event: KeyboardEvent) {
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!arrows.includes(event.key) && ![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat && !arrows.includes(event.key)) return;
    if (event.key === 'ArrowLeft') this.keyboard.x -= GESTURE.keyboardStep;
    if (event.key === 'ArrowRight') this.keyboard.x += GESTURE.keyboardStep;
    if (event.key === 'ArrowUp') this.keyboard.y -= GESTURE.keyboardStep;
    if (event.key === 'ArrowDown') this.keyboard.y += GESTURE.keyboardStep;
    this.keyboard.x = clamp(this.keyboard.x); this.keyboard.y = clamp(this.keyboard.y);
    const rect = this.host.getBoundingClientRect();
    const point = this.actions.point(rect.left + rect.width * this.keyboard.x, rect.top + rect.height * this.keyboard.y);
    this.actions.move(point, GESTURE.keyboardWake);
    if ([' ', 'Enter'].includes(event.key)) this.actions.press?.(point);
    if (event.shiftKey) this.actions.drag(point, GESTURE.keyboardVelocity, GESTURE.keyboardSwell);
    else this.actions.note(point, GESTURE.keyboardVelocity, !arrows.includes(event.key));
    this.actions.start();
  }

  release() { this.pressed = null; this.dragging = false; this.actions.release(); }
  leave() { this.release(); this.previous.time = 0; this.actions.leave?.(); }
  dispose() { this.leave(); this.abort.abort(); }
}
