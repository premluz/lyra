import type { INoteSequence } from '@magenta/music/esm/protobuf';
import type { GenerationRequest, GenerationResponse } from './protocol';
import { MAGENTA } from './config';

interface Pending { resolve: (value: INoteSequence[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
export class MagentaClient {
  private worker: Worker | null = null;
  private serial = 0;
  private pending = new Map<number, Pending>();
  generate(sequence: INoteSequence, similarity: number = MAGENTA.similarity): Promise<INoteSequence[]> {
    if (!this.worker) this.connect();
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('MusicVAE took too long. Your tune is safe; try again.')), MAGENTA.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const checkpoint = new URL(`${import.meta.env.BASE_URL}${MAGENTA.checkpoint}`, location.href).href;
      const request: GenerationRequest = { id, checkpoint, sequence, similarity }; this.worker?.postMessage(request);
    });
  }
  private connect() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      const result = event.data, pending = this.pending.get(result.id);
      if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(result.id);
      if ('error' in result) pending.reject(new Error(result.error)); else pending.resolve(result.sequences);
    };
    this.worker.onerror = event => this.fail(new Error(`MusicVAE worker failed: ${event.message} (${event.filename}:${event.lineno})`));
  }
  private fail(error: Error) {
    this.worker?.terminate(); this.worker = null;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
  dispose() { this.fail(new Error('MusicVAE was closed.')); }
}
