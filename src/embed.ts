import { ParticleRenderer } from './engine/renderer';
import { parseProject } from './engine/validation';
import { clamp } from './engine/director';
import { ENGINE } from './engine/constants';

export interface EmbedOptions { mode?: 'scroll' | 'time' | 'manual'; scrollElement?: HTMLElement; modelBase?: string; light?: boolean }

export async function mountParticles(container: HTMLElement, input: unknown, options: EmbedOptions = {}) {
  const project = parseProject(input);
  const renderer = new ParticleRenderer(container, project, options.modelBase ?? './models');
  try { await renderer.prepare(project); renderer.render(project, 0, 0, options.light); }
  catch (error) { renderer.dispose(); throw new Error('Could not initialize particle experience.', { cause: error }); }
  const mode = options.mode ?? 'scroll';
  let progress = 0, start = performance.now(), frame = 0, paused = false, light = options.light ?? false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function tick(now: number) {
    if (!paused && mode === 'time' && !reduced.matches) {
      const elapsed = (now - start) / ENGINE.milliseconds / project.duration;
      progress = project.loop ? elapsed % 1 : clamp(elapsed);
    }
    if (!paused && mode === 'scroll') progress = scrollProgress(options.scrollElement);
    renderer.render(project, progress, progress * project.duration, light);
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return {
    seek(value: number) { if (!Number.isFinite(value)) throw new Error('Seek requires finite progress.'); progress = clamp(value); },
    setLight(value: boolean) { light = value; },
    pause() { paused = true; },
    play() { paused = false; start = performance.now() - progress * project.duration * ENGINE.milliseconds; },
    destroy() { cancelAnimationFrame(frame); renderer.dispose(); },
  };
}

function scrollProgress(element?: HTMLElement) {
  if (element) {
    const rect = element.getBoundingClientRect();
    return clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
  }
  return clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
}
