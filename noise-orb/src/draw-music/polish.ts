import { COMPOSE } from '../composer/config';
import type { Lane } from '../composer/lanes';
import { MagentaClient } from '../magenta/client';
import { choosePhrase, encodePhrase } from '../magenta/sequence';
import type { Phrase } from '../magenta/sequence';
import { arrangePhrase } from '../magenta/arrange';
import { orderedPitches } from '../composer/rhythm';
import type { DrawDocument } from './document';

export function interpret(source: Lane, phrase: Phrase, amount: number): Phrase {
  const notes: (number | null)[] = Array.from({ length: COMPOSE.steps }, () => null), gates = notes.map(() => 0);
  source.notes.forEach((pitch, step) => {
    const index = Math.min(COMPOSE.steps - 1, Math.round(step * COMPOSE.steps / source.notes.length));
    if (pitch !== null) { notes[index] = pitch; gates[index] = (source.gates?.[step] ?? 0) * COMPOSE.steps / source.notes.length; }
  });
  const anchors = notes.flatMap((pitch, step) => pitch === null ? [] : [step]);
  phrase.notes.forEach((pitch, step) => {
    if (step === anchors[0] || step === anchors.at(-1)) return;
    if (Math.round((step + 1) * amount) > Math.round(step * amount)) { notes[step] = pitch; gates[step] = phrase.gates[step]; }
  });
  return { notes, gates };
}
export class DrawPolish {
  private client = new MagentaClient();
  private epoch = 0;
  busy = false;
  constructor(private document: DrawDocument, private status: (text: string, busy: boolean) => void) {}
  async generate() {
    const source = structuredClone(this.document.score.selected), snapshot = JSON.stringify(this.document.data), token = ++this.epoch;
    this.busy = true; this.status('Your line is playing. Magenta is shaping the arrangement…', true);
    try {
      const sequences = await this.client.generate(encodePhrase(source), 1 - this.document.data.interpretation);
      if (token !== this.epoch) return;
      if (snapshot !== JSON.stringify(this.document.data)) { this.status('Your latest edits were kept. Choose Shape my phrase to try again.', false); return; }
      const phrase = interpret(source, choosePhrase(sequences, source), this.document.data.interpretation);
      const state = structuredClone(this.document.score.state), selected = state.lanes.find(lane => lane.id === source.id);
      if (!selected) throw new Error('Your drawn wave is missing.');
      selected.notes = phrase.notes; selected.gates = phrase.gates;
      selected.phase = selected.notes.findIndex(note => note !== null); selected.motif = orderedPitches(selected);
      const lead = state.lanes.find(lane => lane.role === 'melody' && lane.notes.some(note => note !== null)) ?? selected;
      const result = arrangePhrase(state, lead, { notes: lead.notes, gates: lead.gates ?? lead.notes.map(() => 0) });
      result.lanes = result.lanes.map(lane => this.document.data.authored.includes(lane.id) ? state.lanes.find(item => item.id === lane.id) ?? lane : lane);
      this.document.commit({ ...state, ...result }); this.status('Your drawing, with a little musical shaping. Keep drawing to add another phrase.', false);
    } catch (error) { if (token === this.epoch) this.status(`${error instanceof Error ? error.message : String(error)} Your drawing is safe. Shape my phrase retries.`, false); }
    finally { if (token === this.epoch) this.busy = false; }
  }
  cancel() { this.epoch++; this.busy = false; this.client.dispose(); this.status('Your drawing is ready to play.', false); }
}
