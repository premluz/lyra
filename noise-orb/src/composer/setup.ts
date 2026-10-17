import { MUSIC } from '../config';
import { TICK } from '../score';
import { COMPOSE } from './config';
import type { Composition } from './model';
import { Score } from './model';
import { parseComposition } from './storage';
import { isAudible, isContinuous } from './lanes';
import { referenceHz } from './tuning';
import { formFor } from './composition-config';
import { ScorePlayback } from './playback';
import { isMusicTreatment } from './visual-config';
import type { MusicTreatment } from './visual-config';
import { laneForm } from './composition';
import { isMusicShape } from '../visual/surface';
import type { MusicShape } from '../visual/surface';

export const SETUP = { format: 'noise-orb-setup', version: 1, indent: 2 } as const;
export interface SetupVisuals { treatment: MusicTreatment; alive: number; shape?: MusicShape }

function laneSummary(state: Composition) {
  return state.lanes.map((lane) => {
    const held = isContinuous(lane), count = lane.notes.filter((note) => note !== null).length;
    const seconds = COMPOSE.steps * TICK / lane.rate;
    return { id: lane.id, name: lane.name, role: lane.role, instrument: lane.instrument,
      audible: isAudible(lane, state.ambientTools) && lane.level > 0 && (held || count > 0),
      noteCount: count, form: held ? null : laneForm(lane, state.form), stepsPerPattern: lane.notes.length, pulseBpm: held ? null : MUSIC.bpm * lane.rate,
      patternSeconds: held ? null : seconds, notesPerSecond: held ? null : count / seconds };
  });
}
export function createSetup(composition: Composition, visuals: SetupVisuals, createdAt = new Date()) {
  if (!isMusicTreatment(visuals.treatment) || !Number.isFinite(visuals.alive) || visuals.alive < 0 || visuals.alive > 1) throw new Error('Setup export has invalid orb settings.');
  if (visuals.shape !== undefined && !isMusicShape(visuals.shape)) throw new Error('Setup export has an invalid visual shape.');
  const state = parseComposition(structuredClone(composition)), score = new Score(state), source = new ScorePlayback(score);
  const continuous = source.continuous();
  return { format: SETUP.format, version: SETUP.version, createdAt: createdAt.toISOString(), composition: state, visuals: { ...visuals },
    playback: { bpm: MUSIC.bpm, subdivisionsPerBeat: MUSIC.subdivisions, stepsPerPattern: COMPOSE.steps,
      tuning: score.activeTuning, referenceAHz: referenceHz(score.activeTuning), rootMidi: source.midi(0), scaleSemitones: [...MUSIC.intervals],
      form: structuredClone(formFor(state.form)), baseVelocity: COMPOSE.baseVelocity, outputGain: MUSIC.output,
      reverb: { seconds: continuous.spaceSeconds, wet: continuous.wet },
      delay: { beats: MUSIC.delayBeats, feedback: MUSIC.feedback, send: MUSIC.delaySend, cutoffHz: MUSIC.delayCutoff },
      hoverInstrument: 'Original pluck and hum while interacting with the orb' },
    summary: laneSummary(state) };
}
