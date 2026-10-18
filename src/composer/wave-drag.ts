import { COMPOSE } from './config';
import type { LaneId } from './config';
import type { Score } from './model';

interface WaveGesture { id: number; lane: LaneId; x: number; stepWidth: number; offset: number; moved: boolean }
export class WaveDrag {
  private gesture: WaveGesture | null = null;
  constructor(private score: Score) {}

  start(event: Pick<PointerEvent, 'pointerId' | 'clientX'>, width: number) {
    this.gesture = { id: event.pointerId, lane: this.score.state.selected, x: event.clientX,
      stepWidth: width / this.score.selected.notes.length, offset: 0, moved: false };
  }

  move(event: PointerEvent) {
    const gesture = this.gesture;
    if (!gesture || event.pointerId !== gesture.id) return false;
    const distance = event.clientX - gesture.x;
    if (Math.abs(distance) < COMPOSE.dragThreshold && !gesture.moved) return true;
    gesture.moved = true;
    const offset = Math.round(distance / gesture.stepWidth);
    this.score.shiftLane(gesture.lane, offset - gesture.offset); gesture.offset = offset;
    return true;
  }

  finish(event: PointerEvent) {
    if (event.pointerId !== this.gesture?.id) return null;
    const moved = this.gesture.moved; this.gesture = null;
    return moved ? 'drag' : 'tap';
  }

  cancel(event: PointerEvent) {
    if (event.pointerId !== this.gesture?.id) return;
    this.score.shiftLane(this.gesture.lane, -this.gesture.offset); this.gesture = null;
  }
}
