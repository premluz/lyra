import type { Composition } from '../composer/model';
import type { Lane } from '../composer/lanes';
import { isContinuous } from '../composer/lanes';
import type { InstrumentId } from '../audio/instruments';
import { chooseInstrument } from '../composer/randomise';
import { arrangeHook } from '../composer/v2/generator';
import type { Phrase } from './sequence';

export function arrangePhrase(state: Composition, lead: Lane, phrase: Phrase, random: () => number = Math.random) {
  const result = arrangeHook(state, lead, phrase.notes, random), used = new Set<InstrumentId>();
  result.lanes.forEach(lane => {
    if (isContinuous(lane)) return;
    const previous = state.lanes.find(source => source.id === lane.id);
    if (!previous) throw new Error(`MusicVAE arrangement lost source wave ${lane.id}.`);
    lane.instrument = chooseInstrument(previous, used, null, random);
  });
  const melody = result.lanes.find(lane => lane.id === lead.id);
  if (!melody) throw new Error('MusicVAE arrangement lost its source wave.');
  melody.gates = [...phrase.gates]; return result;
}
