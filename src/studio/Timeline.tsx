import { Copy, Pause, Play, Plus, Repeat2, RotateCcw, Trash2 } from 'lucide-react';
import { Slider } from 'radix-ui';
import { LIMITS } from '../engine/constants';
import { clamp } from '../engine/director';
import { IconButton } from './ui';
import { label } from './constants';
import type { Studio } from './useStudio';

function addFrame(studio: Studio, copy = false) {
  const frames = studio.project.keyframes;
  if (frames.length >= 32) { studio.setError('This experience has reached the 32-keyframe limit.'); return; }
  let at = studio.progress;
  if (copy || frames.some((frame) => Math.abs(frame.at - at) < LIMITS.frameGap)) {
    const intervals = frames.slice(1).map((frame, index) => ({ left: frames[index].at, right: frame.at }));
    const interval = intervals.find((part) => part.left === studio.selected.at) ?? intervals.reduce((best, part) => part.right - part.left > best.right - best.left ? part : best);
    at = (interval.left + interval.right) / 2;
  }
  if (frames.some((frame) => Math.abs(frame.at - at) < LIMITS.frameGap)) { studio.setError('There is no room for another keyframe here.'); return; }
  const frame = { ...structuredClone(studio.selected), id: crypto.randomUUID(), label: copy ? `${studio.selected.label} copy` : `Scene ${frames.length + 1}`, at: clamp(at) };
  studio.update({ ...studio.project, keyframes: [...frames, frame].sort((a, b) => a.at - b.at) });
  studio.selectFrame(frame);
}

export function Timeline({ studio }: { studio: Studio }) {
  const locked = studio.selected.at === 0 || studio.selected.at === 1;
  return <section className="timeline"><div className="timeline-top"><div className="toolbar-group"><span className="panel-title">DIRECTOR</span><span className="badge">SCROLL / TIME</span></div>
    <div className="transport"><IconButton icon={RotateCcw} label="Restart playback" onClick={() => { studio.setPlaying(false); studio.setProgress(0); }} />
      <IconButton icon={studio.playing ? Pause : Play} label={studio.playing ? 'Pause playback' : 'Play sequence'} active={studio.playing} onClick={() => { if (studio.progress === 1) studio.setProgress(0); studio.setPlaying(!studio.playing); }} />
      <IconButton icon={Repeat2} label="Toggle loop" active={studio.project.loop} onClick={() => studio.update({ ...studio.project, loop: !studio.project.loop })} />
      <code>{(studio.progress * studio.project.duration).toFixed(2)}<span> / {studio.project.duration.toFixed(2)}s</span></code></div>
    <div className="toolbar-group"><IconButton icon={Copy} label="Duplicate keyframe" onClick={() => addFrame(studio, true)} />
      <IconButton icon={Trash2} label="Delete selected keyframe" disabled={locked} onClick={() => {
        const frames = studio.project.keyframes.filter((frame) => frame.id !== studio.selected.id);
        studio.update({ ...studio.project, keyframes: frames }); studio.selectFrame(frames[0]);
      }} /><button className="small-button" onClick={() => addFrame(studio)}><Plus size={13} />Add keyframe</button></div></div>
    <div className="timeline-ruler"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <Slider.Root className="timeline-slider" min={0} max={1} step={0.001} value={[studio.progress]} onValueChange={([value]) => { studio.setPlaying(false); studio.setProgress(value); }}>
      <Slider.Track className="timeline-track"><Slider.Range className="timeline-fill" /></Slider.Track><Slider.Thumb className="playhead" aria-label="Timeline progress" />
    </Slider.Root>
    <div className="sequence-cards">{studio.project.keyframes.map((frame, index) => <button key={frame.id} className={`sequence-card ${studio.selected.id === frame.id ? 'selected' : ''}`} onClick={() => studio.selectFrame(frame)}>
      <span className="sequence-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{frame.label}</strong><small>{label(frame.state.shape)} · {label(frame.state.motion)}</small></span><code>{Math.round(frame.at * 100)}%</code>
    </button>)}</div>
  </section>;
}
