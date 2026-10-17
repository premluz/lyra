import type { INoteSequence } from '@magenta/music/esm/protobuf';

export interface GenerationRequest {
  id: number; checkpoint: string; sequence: INoteSequence; similarity: number;
}
export type GenerationResponse = { id: number; sequences: INoteSequence[] } | { id: number; error: string };
