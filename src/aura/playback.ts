import { ScorePlayback } from '../composer/playback';
import type { Score } from '../composer/model';
import { clamp, MUSIC } from '../config';
import { COMPOSE } from '../composer/config';
import type { SequenceNote } from '../audio/sequence';
import { AURA } from './config';
import type { AuraInteraction } from './interaction';

export class AuraPlayback extends ScorePlayback {
  private epoch: number | null = null;
  private pressed = 0;
  private released = 0;
  private echoes: number[] = [];
  constructor(private world: Score, readonly interaction: AuraInteraction) { super(world); }
  override note(id: string, step: number) {
    const note = super.note(id, step), state = this.interaction, lane = this.world.lane(id);
    const side = lane.role === 'undertow' ? 1 - state.nx : lane.role === 'air' ? state.nx : 1 - Math.abs(state.nx - 0.5);
    return { ...note, index: Math.round(clamp(note.index + state.bloom * (1 - state.ny) * AURA.pitchBloom, COMPOSE.pitchMin, COMPOSE.pitchMax)),
      velocity: note.velocity * (1 - state.hover * AURA.layerFocus * (1 - side)),
      shape: { ...note.shape, cutoff: note.shape.cutoff * (1 + (state.nx - 0.5) * state.hover * AURA.cutoffMovement + state.charge * AURA.cutoffCharge),
        decay: note.shape.decay * (1 + state.charge * AURA.decayCharge) } };
  }
  override schedule(time: number, tick: number): ReturnType<ScorePlayback['schedule']> {
    this.epoch ??= tick;
    const local = tick - this.epoch, notes = super.schedule(time, local);
    return [...notes, ...this.gestures(local).map((note) => ({ ...note, delay: 0 }))];
  }
  private gestures(tick: number): SequenceNote[] {
    const state = this.interaction;
    if (state.releases !== this.released) {
      this.released = state.releases;
      this.echoes = state.releasedAfter >= AURA.openAt ? [...AURA.releaseNotes] : [];
    }
    if (state.presses !== this.pressed) { this.pressed = state.presses; this.echoes = []; return state.cancelled ? [] : [this.touch(tick, 0)]; }
    if (state.held && state.age >= AURA.openAt && tick % (state.phase === 'bloom' ? AURA.bloomEvery : AURA.chordEvery) === 0) return [this.touch(tick, 0), this.touch(tick, MUSIC.intervals.length - 2)];
    const echo = this.echoes.shift();
    return echo === undefined ? [] : [this.touch(tick, echo)];
  }
  private touch(tick: number, offset: number): SequenceNote {
    const state = this.interaction, column = Math.min(AURA.gestureInstruments.length - 1, Math.floor(state.nx * AURA.gestureInstruments.length));
    const index = Math.round(clamp(state.nx * MUSIC.intervals.length + (1 - state.ny) * MUSIC.intervals.length + offset, COMPOSE.pitchMin, COMPOSE.pitchMax));
    return { lane: AURA.touchLane, step: tick, index, velocity: AURA.gestureVelocity, point: { ...state.point },
      shape: { instrument: AURA.gestureInstruments[column], decay: AURA.gestureDecay * (1 + state.charge),
        cutoff: AURA.gestureCutoff + (1 - state.ny) * AURA.gestureCutoffRange, attack: MUSIC.attack } };
  }
  override voiceLimit() { return AURA.voiceLimit; }
  override reset() {
    super.reset(); this.epoch = null; this.echoes = []; this.pressed = this.interaction.presses; this.released = this.interaction.releases;
  }
}
