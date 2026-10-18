import { Score } from '../src/composer/model';
import { COMPOSE } from '../src/composer/config';

export function compositionFixture(variant: 'trio' | 'custom-polyphony' = 'trio') {
  const score = new Score();
  if (variant === 'custom-polyphony') {
    score.addLane('air'); score.addLane('undertow'); score.state.lanes.reverse();
    score.state.lanes.forEach((lane, index) => { lane.id = `voice-${index * 7}`; lane.name = `Instrument ${index}`; });
    score.state.selected = score.state.lanes[0].id;
  }
  score.state.lanes.forEach((lane, index) => {
    lane.notes.fill(null); lane.enabled = true; lane.instrument = 'felt'; lane.length = 0.6;
    const steps = lane.role === 'melody' ? [0, 3, 7, 11, 14, 19, 22] : lane.role === 'undertow' ? [0, 8, 16] : [2, 10, 15, 20];
    const pitches = lane.role === 'melody' ? [2, 4, 6, 7, 5, 3, 2] : lane.role === 'undertow' ? [0, 0, 0] : [9, 11, 12, 10];
    steps.forEach((step, i) => { lane.notes[(step + (variant === 'trio' ? 0 : index * 3)) % COMPOSE.steps] = pitches[i]; });
  });
  return score;
}
