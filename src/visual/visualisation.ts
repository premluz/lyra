import type { Blending, WebGLRenderer } from 'three';
import type { AudioFrame } from '../audio/meter';
import type { NoteEvent, TouchPoint } from '../score';
import type { MusicShape } from './surface';

export interface VisualBackground {
  render(renderer: WebGLRenderer, delta: number): void;
}

export interface OrbVisualisation {
  readonly background?: VisualBackground;
  readonly vertexShader: string;
  readonly fragmentShader: string;
  readonly uniforms: Record<string, { value: unknown }>;
  readonly blending: Blending;
  readonly shape?: MusicShape;
  update(time: number, delta: number, audio: AudioFrame): void;
  note(event: NoteEvent): void;
  move?(point: TouchPoint, speed: number): void;
  hold?(held: boolean): void;
  leave?(): void;
  reset(): void;
  dispose(): void;
}
