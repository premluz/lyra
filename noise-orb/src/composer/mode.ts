import { COMPOSE } from './config';
import { createComposition } from './model';
import type { CompositionGenerator } from './model';
import { V2 } from './v2/config';
import { createV2Composition, randomiseV2 } from './v2/generator';
import { MAGENTA } from '../magenta/config';

export function studioMode(id: string | undefined): { key: string; initial: typeof createComposition; generator?: CompositionGenerator; magenta: boolean } {
  if (id === 'v3') return { key: MAGENTA.storageKey, initial: createV2Composition, magenta: true };
  if (id === 'v2') return { key: V2.storageKey, initial: createV2Composition, generator: randomiseV2, magenta: false };
  if (id !== undefined) throw new Error(`Unknown composer mode: ${id}`);
  return { key: COMPOSE.storageKey, initial: createComposition, magenta: false };
}
