import type { SoundEngine } from '../audio/engine';
import { ScorePlayback } from '../composer/playback';
import type { Score } from '../composer/model';
import { report } from '../ui';
import { drawnPitch } from './stroke';
import type { TimedPoint } from './stroke';
import { DRAW_MUSIC as D } from './config';

export class LiveStroke {
  private active = false;
  private serial = 0;
  private pitch: number | null = null;
  private latest: TimedPoint | null = null;
  private cancelVoice: ((release?: number) => void) | null = null;
  constructor(private score: Score, private sound: () => SoundEngine | null, private activate: () => Promise<void>) {}
  begin(point: TimedPoint) {
    this.cancel(); this.active = true; this.latest = point; const token = this.serial;
    void this.activate().then(() => {
      if (token !== this.serial || !this.latest) return;
      this.play(this.latest, this.active);
    }).catch(report);
    this.play(point, true);
  }
  move(point: TimedPoint) { this.latest = point; if (this.active) this.play(point, true); }
  end() { this.active = false; this.cancelVoice?.(D.release); this.cancelVoice = null; }
  cancel() { this.serial++; this.end(); this.latest = null; this.pitch = null; }
  private play(point: TimedPoint, held: boolean) {
    const lane = this.score.selected, pitch = drawnPitch(point, lane);
    if (pitch === this.pitch || this.sound()?.state !== 'running') return;
    this.cancelVoice?.(D.release);
    const note = new ScorePlayback(this.score).note(lane.id, Math.round(point.x * (lane.notes.length - 1)));
    note.index = pitch; note.point.nx = point.x; note.shape.hold = held ? D.liveHold : 0;
    const stop = this.sound()?.immediate(note);
    if (stop) { this.pitch = pitch; this.cancelVoice = held ? stop : null; }
  }
}
