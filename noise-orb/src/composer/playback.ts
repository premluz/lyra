import { MUSIC } from '../config';
import { SCALE, TICK } from '../score';
import type { SequenceNote, SequenceSource } from '../audio/sequence';
import { COMPOSE } from './config';
import type { LaneId } from './config';
import type { Score } from './model';
import { pitchFor } from './model';
import { isContinuous, roleDefinition } from './lanes';
import { midiFor, referenceHz, tunedFrequency, TUNING } from './tuning';
import { SUSTAIN } from '../audio/sustain-config';
import type { SustainedFrame } from '../audio/sustain-config';
import { composeNote, phraseAt, laneForm } from './composition';
import { COMPOSITION } from './composition-config';
import { laneTicks } from './pace';

export class ScorePlayback implements SequenceSource {
  readonly authoredOnly = true;
  private origin: number | null = null;
  constructor(private score: Score) {}
  schedule(time: number, tick: number) {
    this.origin ??= time - tick * TICK;
    return this.score.state.lanes.flatMap((lane) => {
      if (!lane.enabled || isContinuous(lane) || lane.level === 0) return [];
      return laneTicks(tick, lane.rate, lane.notes.length).flatMap(({ step, offset }) => lane.notes[step] === null ? [] :
        composeNote(this.note(lane.id, step), lane, tick + offset, laneForm(lane, this.score.state.form))
          .map((note) => ({ ...note, delay: (note.delay ?? 0) + offset * TICK })));
    }).sort((left, right) => (left.delay ?? 0) - (right.delay ?? 0));
  }
  note(id: LaneId, step: number): SequenceNote {
    const lane = this.score.lane(id), definition = roleDefinition(lane.role);
    const index = pitchFor(lane, lane.notes[step] ?? definition.base);
    const nx = index / (SCALE.length - 1);
    const balance = Math.sqrt(COMPOSE.balanceLanes / Math.max(COMPOSE.balanceLanes, this.score.state.lanes.filter((item) => item.enabled && !isContinuous(item)).length));
    return { lane: id, step, index, velocity: lane.level * COMPOSE.baseVelocity * balance,
      point: { nx, depth: nx, x: (nx * 2 - 1) * MUSIC.ambientWidth, z: Math.sin(step) * MUSIC.ambientDepth },
      shape: { instrument: lane.instrument, decay: COMPOSE.decayMin + lane.length * COMPOSE.decayRange, cutoff: COMPOSE.cutoffLow + lane.tone * COMPOSE.cutoffRange,
        ...(lane.gates ? { hold: lane.gates[step] * TICK * COMPOSE.steps / lane.notes.length / lane.rate } : {}) } };
  }
  continuous(): SustainedFrame {
    const state = this.score.state;
    if (!state.ambientTools) return { legacyBed: false, spaceSeconds: MUSIC.reverbSeconds, wet: MUSIC.reverbWet, lanes: [] };
    return { legacyBed: false, spaceSeconds: state.spaceSeconds, wet: state.wet,
      lanes: state.lanes.flatMap((lane) => !lane.enabled || !isContinuous(lane) ? [] : [{
        id: lane.id, kind: lane.role === 'binaural' ? 'binaural' : 'drone', instrument: lane.instrument,
        frequency: tunedFrequency(pitchFor(lane, lane.pitch), state.tuning), level: lane.level,
        cutoff: COMPOSE.cutoffLow + lane.tone * COMPOSE.cutoffRange, attack: lane.attack,
        release: SUSTAIN.release.min + lane.length * SUSTAIN.release.range, breath: lane.breath,
        movement: lane.movement, carrier: lane.carrier, beat: lane.beat,
      }]) };
  }
  midi(index: number) { return midiFor(index, this.score.activeTuning); }
  tuning() { return referenceHz(this.score.activeTuning) / TUNING.referenceA; }
  voiceLimit() { return this.score.state.lanes.length * (this.score.state.lanes.some((lane) => laneForm(lane, this.score.state.form) !== 'loop') ? COMPOSITION.voiceOverlap : COMPOSE.voiceOverlap); }
  phrase(time: number, id = this.score.state.selected) { return phraseAt(this.origin === null ? 0 : Math.floor(Math.max(0, (time - this.origin) / TICK)), laneForm(this.score.lane(id), this.score.state.form)); }
  elapsed(time: number) { return this.origin === null ? -1 : Math.max(0, (time - this.origin) / TICK); }
  position(time: number, id?: LaneId) {
    const tick = this.elapsed(time), lane = id ? this.score.lane(id) : null, steps = lane?.notes.length ?? COMPOSE.steps;
    return tick < 0 ? -1 : tick * (lane?.rate ?? 1) * steps / COMPOSE.steps % steps;
  }
  reset() { this.origin = null; }
}
