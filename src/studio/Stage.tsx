import { useEffect, useRef, useState } from 'react';
import { Grid2X2, Maximize, Moon, MousePointer2, Sun, Camera } from 'lucide-react';
import { ParticleRenderer } from '../engine/renderer';
import { clamp } from '../engine/director';
import { ENGINE } from '../engine/constants';
import type { Studio } from './useStudio';
import { IconButton } from './ui';
import { download, message, slug } from './files';
import { label } from './constants';

function useRenderer(studio: Studio) {
  const container = useRef<HTMLDivElement>(null), runtime = useRef<ParticleRenderer | null>(null);
  const state = useRef(studio);
  const [ready, setReady] = useState(false);
  useEffect(() => { state.current = studio; });
  useEffect(() => {
    if (!container.current) return;
    const renderer = new ParticleRenderer(container.current, studio.project, `${import.meta.env.BASE_URL}models`);
    runtime.current = renderer;
    let frame = 0, previous = performance.now(), progress = state.current.progress;
    const tick = (now: number) => {
      const current = state.current, delta = Math.min((now - previous) / ENGINE.milliseconds, 0.1);
      previous = now;
      progress = current.playing ? progress + delta / current.project.duration : current.progress;
      if (progress > 1) { progress = current.project.loop ? progress % 1 : 1; if (!current.project.loop) current.setPlaying(false); }
      if (current.playing) current.setProgress(progress);
      try { renderer.render(current.project, progress, progress * current.project.duration, current.light); }
      catch (error) { current.setError(message(error)); current.setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); renderer.dispose(); runtime.current = null; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    runtime.current?.prepare(studio.project).then((prepared) => { if (!cancelled && prepared) setReady(true); })
      .catch((error: unknown) => { if (!cancelled) studio.setError(message(error)); });
    return () => { cancelled = true; };
  }, [studio.project]);
  return { container, runtime, ready };
}

function StageTools({ studio, capture }: { studio: Studio; capture: () => void }) {
  return <div className="stage-toolbar"><div className="toolbar-group"><MousePointer2 size={13} /><span>{studio.preview ? 'Scroll preview' : 'Scene viewport'}</span></div>
    <div className="toolbar-group"><IconButton icon={Grid2X2} label="Toggle viewport grid" active={studio.grid} onClick={() => studio.setGrid(!studio.grid)} />
      <span className="divider" /><IconButton icon={studio.light ? Sun : Moon} label={studio.light ? 'Use dark background' : 'Use light background'} onClick={() => studio.setLight(!studio.light)} />
      <IconButton icon={Camera} label="Capture transparent PNG" onClick={capture} /><IconButton icon={Maximize} label="Fullscreen viewport" onClick={() => {
        const stage = document.querySelector('.stage');
        if (stage instanceof HTMLElement) stage.requestFullscreen().catch((error: unknown) => studio.setError(message(error)));
      }} /></div></div>;
}

export function Stage({ studio }: { studio: Studio }) {
  const { container, runtime, ready } = useRenderer(studio);
  const screenshot = () => {
    const data = runtime.current?.capture();
    if (!data) return;
    const link = document.createElement('a'); link.href = data; link.download = `${slug(studio.project.name)}.png`; link.click();
  };
  return <section className="stage-area"><StageTools studio={studio} capture={screenshot} />
    <div className={`stage ${studio.light ? 'stage-light' : ''} ${studio.grid ? 'has-grid' : ''}`}>
      <div className="viewport-label"><span className="live-dot" />WEBGL <span>/</span> {label(studio.selected.state.shape).toUpperCase()}</div>
      <div className="stage-canvas" ref={container} data-testid="particle-viewport" />
      {studio.preview && <div className="scroll-surface" tabIndex={0} aria-label="Scroll preview" onScroll={(event) => {
        const el = event.currentTarget; studio.setPlaying(false); studio.setProgress(clamp(el.scrollTop / (el.scrollHeight - el.clientHeight)));
      }}><div className="scroll-space"><div className="scroll-instruction"><span>YOUR WEBSITE, IN MOTION</span><h2>One field.<br />A whole story.</h2><p>Scroll to explore your particle sequence.</p><span className="scroll-arrow">↓</span></div><div className="scroll-end">End of experience</div></div></div>}
      {!ready && <div className="loading-state" role="status">Preparing particle field…</div>}
      <div className="viewport-bottom"><span>{studio.preview ? 'SCROLL TO SCRUB' : 'HOLD POINTER TO INTERACT'}</span><code>{Math.round(studio.progress * 100)}% · {studio.project.particleCount.toLocaleString()} POINTS</code></div>
    </div>
    <div className="stage-caption"><span className="field-dot" /><span>{ready ? 'Renderer ready' : 'Loading geometry'}</span><span>GPU morph · GLSL styles</span><button onClick={() => download(JSON.stringify(studio.project, null, 2), `${slug(studio.project.name)}.json`)}>Save project JSON ↗</button></div>
  </section>;
}
