import { ScorePlayback } from '../composer/playback';
import type { Score } from '../composer/model';
import { SCULPT, REST_FOCUS } from './config';
import type { SculptFocus } from './config';

export class SculptPlayback extends ScorePlayback {
  private focus: SculptFocus = { ...REST_FOCUS };
  private target: SculptFocus = { ...REST_FOCUS };
  constructor(private sculpture: Score) { super(sculpture); }
  aim(focus: SculptFocus) { this.target = focus; }
  advance(delta: number) {
    const ease = 1 - Math.exp(-delta / SCULPT.hoverEase);
    for (const key of ['proximity', 'height', 'depth'] as const) this.focus[key] += (this.target[key] - this.focus[key]) * ease;
  }
  override note(id: string, step: number) {
    const note = super.note(id, step);
    if (id !== this.sculpture.state.selected) return note;
    const amount = this.focus.proximity, colour = this.focus.height + this.focus.depth;
    return { ...note, velocity: note.velocity * (1 + amount * SCULPT.hoverGain),
      shape: { ...note.shape, cutoff: note.shape.cutoff * (1 + amount * colour * SCULPT.hoverCutoff),
        decay: note.shape.decay * (1 + amount * SCULPT.hoverDecay) } };
  }
}
