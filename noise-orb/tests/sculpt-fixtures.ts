import { newSculpt } from '../src/sculpt/storage';
import { COMPOSE } from '../src/composer/config';

export function sculptFixture(dense = false) {
  const setup = newSculpt(() => dense ? 0.7 : 0.3);
  setup.composition.selected = 'melody';
  if (dense) {
    setup.composition.lanes.reverse();
    setup.composition.lanes.forEach((lane, index) => {
      lane.name = 'Voice'; lane.notes = Array.from({ length: COMPOSE.maxDensity }, (_, step) => step % 4 + index * 4);
      lane.motif = lane.notes.flatMap((pitch) => pitch === null ? [] : [pitch]);
    });
  }
  return setup;
}
