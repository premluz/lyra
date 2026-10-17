import { MUSIC } from '../config';
import { TICK } from '../score';

export class BeatClock {
  private next = 0;
  private tick = 0;
  private initialized = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private now: () => number, private schedule: (time: number, tick: number) => void) {}

  start() {
    if (this.timer !== null) return;
    if (!this.initialized) { this.next = this.now() + MUSIC.startLead; this.initialized = true; }
    this.pump(); this.timer = setInterval(() => this.pump(), MUSIC.timerMs);
  }

  pump() {
    const now = this.now();
    // Missed ticks are dropped instead of bursting when a background timer wakes.
    while (this.next < now) { this.next += TICK; this.tick++; }
    while (this.next < now + MUSIC.lookahead) {
      this.schedule(this.next, this.tick++); this.next += TICK;
    }
  }

  stop() { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
}
