import { EASES, MOTIONS, SHAPES } from './types';
import { LIMITS } from './constants';
import { styleUniforms } from './extracted/uniforms';
import type { EaseKey, Keyframe, MotionKey, Project, SceneState, ShapeKey, Vec3 } from './types';

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected a project object.');
  return Object.fromEntries(Object.entries(value));
}
function number(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}
function text(value: unknown, name: string, max = LIMITS.nameMax) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} must be 1–${max} characters.`);
  return value;
}
function option<T extends string>(value: unknown, options: readonly T[], name: string): T {
  const found = options.find((item) => item === value);
  if (!found) throw new Error(`Unknown ${name}: ${String(value)}`);
  return found;
}
function vector(value: unknown, name: string, limit: number): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${name} requires three coordinates.`);
  return [number(value[0], name, -limit, limit), number(value[1], name, -limit, limit), number(value[2], name, -limit, limit)];
}
function color(value: unknown) {
  if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value)) throw new Error('Colors require six hexadecimal digits.');
  return value;
}
function uniforms(value: unknown) {
  const input = object(value), defaults = styleUniforms();
  const result: Record<string, number> = {};
  for (const [key, amount] of Object.entries(input)) {
    const definition = Object.entries(defaults).find(([name]) => name === key)?.[1];
    if (!definition || typeof definition.value !== 'number') throw new Error(`Unknown numeric uniform: ${key}`);
    result[key] = number(amount, key, -1000, 1000);
  }
  return result;
}
function scene(value: unknown): SceneState {
  const data = object(value);
  return {
    shape: option<ShapeKey>(data.shape, SHAPES, 'shape'), motion: option<MotionKey>(data.motion, MOTIONS, 'motion'),
    renderStyle: option(data.renderStyle, ['glow', 'halftone'], 'render style'),
    position: vector(data.position, 'Position', 100), rotation: vector(data.rotation, 'Rotation', 720),
    scale: number(data.scale, 'Scale', 0.01, 10), cameraZ: number(data.cameraZ, 'Camera', 1, 100),
    size: number(data.size, 'Size', 0.05, 10), opacity: number(data.opacity, 'Opacity', 0, 1),
    color: color(data.color), waveColor: color(data.waveColor), uniforms: uniforms(data.uniforms),
  };
}
function keyframe(value: unknown): Keyframe {
  const data = object(value);
  return { id: text(data.id, 'Keyframe ID'), label: text(data.label, 'Keyframe name'),
    at: number(data.at, 'Keyframe progress', 0, 1), ease: option<EaseKey>(data.ease, EASES, 'ease'), state: scene(data.state) };
}
export function parseProject(input: unknown): Project {
  const data = object(input);
  if (data.version !== 1) throw new Error('Unsupported project version. Expected version 1.');
  if (!Array.isArray(data.keyframes) || data.keyframes.length < 2 || data.keyframes.length > 32) throw new Error('Projects require 2–32 keyframes.');
  const keyframes = data.keyframes.map(keyframe);
  const ids = new Set(keyframes.map((frame) => frame.id));
  if (ids.size !== keyframes.length) throw new Error('Keyframe IDs must be unique.');
  if (keyframes[0].at !== 0 || keyframes[keyframes.length - 1].at !== 1) throw new Error('The first and last keyframes must be at 0% and 100%.');
  if (keyframes.some((frame, index) => index > 0 && frame.at - keyframes[index - 1].at < LIMITS.frameGap)) throw new Error('Keyframes must be sorted and at least 0.5% apart.');
  if (typeof data.loop !== 'boolean') throw new Error('Loop must be a boolean.');
  const particleCount = number(data.particleCount, 'Particle count', LIMITS.countMin, LIMITS.countMax);
  if (!Number.isInteger(particleCount)) throw new Error('Particle count must be an integer.');
  const seed = number(data.seed, 'Seed', 0, 4294967295);
  if (!Number.isInteger(seed)) throw new Error('Seed must be an integer.');
  return { version: 1, name: text(data.name, 'Project name'), particleCount,
    duration: number(data.duration, 'Duration', 1, 120), seed, loop: data.loop, keyframes };
}
