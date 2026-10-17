import * as tf from '@tensorflow/tfjs';
import type { MusicVAE } from '@magenta/music/esm/music_vae/model';
import type { GenerationRequest, GenerationResponse } from './protocol';
import { MAGENTA } from './config';

let model: Promise<MusicVAE> | null = null;
async function initialize(checkpoint: string) {
  const { MusicVAE } = await import('@magenta/music/esm/music_vae/model');
  await tf.setBackend('cpu'); await tf.ready();
  const instance = new MusicVAE(checkpoint); await instance.initialize(); return instance;
}
self.onmessage = async (event: MessageEvent<GenerationRequest>) => {
  const request = event.data;
  try {
    model ??= initialize(request.checkpoint);
    const instance = await model;
    const sequences = await instance.similar(request.sequence, MAGENTA.candidates, request.similarity, MAGENTA.temperature);
    const response: GenerationResponse = { id: request.id, sequences }; self.postMessage(response);
  } catch (error) {
    model = null;
    const response: GenerationResponse = { id: request.id, error: `MusicVAE generation failed: ${error instanceof Error ? error.message : String(error)}` };
    self.postMessage(response);
  }
};
