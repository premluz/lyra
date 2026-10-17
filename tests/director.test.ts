import { describe, expect, it } from 'vitest';
import { sampleDirector } from '../src/engine/director';
import { createProject } from '../src/engine/defaults';
import { parseProject } from '../src/engine/validation';

describe('director and project boundaries', () => {
  it('samples endpoints, clamps, and gives the same result after reverse seeks', () => {
    const project = createProject();
    expect(sampleDirector(project, -1).from.id).toBe('arrival');
    expect(sampleDirector(project, 2).from.id).toBe('resolve');
    const forward = sampleDirector(project, 0.25);
    sampleDirector(project, 0.9);
    expect(sampleDirector(project, 0.25)).toEqual(forward);
    expect(forward.mix).toBeCloseTo(0.5);
  });
  it('accepts a genuinely different sequence with uneven timing and flat geometry', () => {
    const project = createProject();
    project.keyframes[1].at = 0.2;
    project.keyframes[1].state.shape = 'dots';
    project.keyframes[1].ease = 'none';
    project.keyframes[2].state.shape = 'terrain';
    project.keyframes[2].ease = 'none';
    const parsed = parseProject(project);
    expect(sampleDirector(parsed, 0.1).mix).toBeCloseTo(0.5);
    expect(sampleDirector(parsed, 0.6).mix).toBeCloseTo(0.5);
  });
  it.each(['duplicate', 'unordered', 'infinite', 'missing', 'uniform', 'empty-name'])('rejects malformed %s projects', (kind) => {
    const project = createProject();
    if (kind === 'duplicate') project.keyframes[1].id = project.keyframes[0].id;
    if (kind === 'unordered') project.keyframes[1].at = 1;
    if (kind === 'infinite') project.keyframes[0].state.scale = Infinity;
    if (kind === 'missing') project.keyframes.shift();
    if (kind === 'uniform') project.keyframes[0].state.uniforms.nonexistent = 1;
    if (kind === 'empty-name') project.name = '';
    expect(() => parseProject(project)).toThrow();
  });
});
