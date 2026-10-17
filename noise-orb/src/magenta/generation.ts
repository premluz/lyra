import type { Score } from '../composer/model';
import { isContinuous } from '../composer/lanes';
import { MagentaClient } from './client';
import { choosePhrase, encodePhrase } from './sequence';
import { arrangePhrase } from './arrange';

export class MelodyGeneration {
  private client = new MagentaClient();
  private epoch = 0;
  busy = false;
  constructor(private score: Score, private status: (message: string, busy: boolean) => void, private activate: () => Promise<void>) {}
  async generate() {
    const lead = this.score.state.lanes.find(lane => lane.role === 'melody') ?? this.score.state.lanes.find(lane => !isContinuous(lane));
    if (!lead) throw new Error('Add a note wave before generating a melody.');
    const token = ++this.epoch, snapshot = JSON.stringify(this.score.state);
    this.busy = true; this.status('MusicVAE is finding a new phrase…', true);
    try {
      const sequences = await this.client.generate(encodePhrase(lead));
      if (token !== this.epoch) return;
      if (snapshot !== JSON.stringify(this.score.state)) { this.status('Your edits were kept. Generate again when you’re ready.', false); return; }
      this.score.applyGeneration(arrangePhrase(this.score.state, lead, choosePhrase(sequences, lead)));
      await this.activate(); this.status('A new Magenta variation. Every note is yours to edit.', false);
    } catch (error) {
      if (token === this.epoch) this.status(`${error instanceof Error ? error.message : String(error)} Use Randomise to retry.`, false);
    } finally { if (token === this.epoch) this.busy = false; }
  }
  cancel() { this.epoch++; this.busy = false; this.client.dispose(); this.status('Generation cancelled. Your tune is unchanged.', false); }
}
