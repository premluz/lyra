import { compositionFixture } from './composition-fixtures';
import { ScorePlayback } from '../src/composer/playback';
import { WaveSurface } from '../src/composer/surface';
import { COMPOSE } from '../src/composer/config';
import { RATES } from '../src/composer/pace';
import { TICK } from '../src/score';
import { noteX } from '../src/composer/waves';

const ORIGIN = 0.025;
export function mountPlayheads(variant: 'trio' | 'custom-polyphony') {
  const score = compositionFixture(variant);
  if (variant === 'trio') score.addLane('melody');
  score.state.lanes.forEach((lane, index) => { lane.rate = RATES[index % RATES.length].value; lane.notes = lane.notes.map((_, step) => step % 5 + 2); });
  const source = new ScorePlayback(score), surface = new WaveSurface(score, () => {}, () => {});
  const host = document.getElementById('wave-surface');
  if (!host) throw new Error('Playhead fixture has no wave surface host.');
  host.replaceChildren(surface.element); source.schedule(ORIGIN, 0);
  return { score, source, surface };
}
function heads(surface: WaveSurface) {
  return [...surface.element.querySelectorAll<SVGLineElement>('.playhead')].map((head) => ({
    id: head.dataset.lane, x: Number(head.getAttribute('x1')), visible: head.getAttribute('visibility') === 'visible',
    selected: head.dataset.selected === 'true', opacity: Number(getComputedStyle(head).strokeOpacity),
  }));
}
function onsetErrors({ score, source, surface }: ReturnType<typeof mountPlayheads>) {
  const errors: number[] = [], rates = new Set<number>();
  for (let tick = 0; tick < COMPOSE.steps; tick++) {
    const start = ORIGIN + tick * TICK;
    for (const note of source.schedule(start, tick)) {
      const time = start + (note.delay ?? 0); surface.note(note.lane, time, note.step); surface.paint(time, source.elapsed(time));
      const head = heads(surface).find((head) => head.id === note.lane);
      if (!head?.visible) throw new Error(`Missing playing cursor for ${note.lane}.`);
      const dots = [...surface.element.querySelectorAll<SVGCircleElement>('.note-dot')].filter((dot) => dot.dataset.lane === note.lane);
      if (dots[note.step].dataset.playing !== 'true') throw new Error(`Unlit note ${note.step} in ${note.lane}.`);
      errors.push(Math.abs(head.x - noteX(note.step))); rates.add(score.lane(note.lane).rate);
    }
  }
  return { count: errors.length, max: Math.max(...errors), rates: [...rates].sort() };
}
function lifecycle({ score, source, surface }: ReturnType<typeof mountPlayheads>) {
  const [disabled, empty, silent] = score.state.lanes;
  disabled.enabled = false; empty.notes.fill(null); silent.level = 0;
  const held = score.addLane('drone'); held.notes.fill(2);
  surface.update(); surface.paint(5, source.elapsed(5));
  const hidden = heads(surface).filter((head) => !head.visible).map((head) => head.id);
  score.removeLane(disabled.id); surface.update();
  const removed = !heads(surface).some((head) => head.id === disabled.id);
  source.reset(); surface.paint(0, source.elapsed(0));
  return { hidden, expected: [disabled.id, empty.id, silent.id, held.id], removed,
    reset: heads(surface).every((head) => !head.visible), flashes: surface.element.querySelectorAll('[data-playing="true"]').length };
}
export function playheadProbe(variant: 'trio' | 'custom-polyphony') {
  const fixture = mountPlayheads(variant), { score, source, surface } = fixture;
  const frames = [3, 25, 49].map((tick, index) => {
    score.select(score.state.lanes[index].id); score.state.lanes.reverse(); surface.update();
    const time = ORIGIN + tick * TICK; surface.paint(time, source.elapsed(time));
    return heads(surface).map((head) => {
      if (!head.id) throw new Error('A playhead has no lane ID.');
      return { ...head, expectedX: noteX(tick * score.lane(head.id).rate % COMPOSE.steps) % COMPOSE.width,
        expectedSelected: head.id === score.selected.id };
    });
  });
  return { frames, onsets: onsetErrors(fixture), lifecycle: lifecycle(fixture) };
}

export function livePlayheadProbe() {
  const note = WaveSurface.prototype.note, paint = WaveSurface.prototype.paint;
  return new Promise<{ tick: number; expected: number; positions: ReturnType<typeof heads> }>((resolve, reject) => {
    let origin: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => { if (timeout !== undefined) clearTimeout(timeout); WaveSurface.prototype.note = note; WaveSurface.prototype.paint = paint; };
    WaveSurface.prototype.note = function(lane, time, step) {
      if (origin === null) {
        origin = time; timeout = setTimeout(() => { cleanup(); reject(new Error('Live playheads did not receive audio-clock frames after the first note.')); }, 5000);
      }
      note.call(this, lane, time, step);
    };
    WaveSurface.prototype.paint = function(time, tick) {
      paint.call(this, time, tick);
      if (origin !== null && time > origin + 0.6) {
        cleanup(); resolve({ tick, expected: (time - origin) / TICK, positions: heads(this) });
      }
    };
    document.body.dataset.playheadProbe = 'ready';
  });
}
