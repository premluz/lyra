import { useState } from 'react';
import { Box, Circle, Diamond, Grid2X2, Layers, Search, Shapes, Sparkles, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SHAPES } from '../engine/types';
import { label } from './constants';
import { Range, Section } from './ui';
import { LIMITS } from '../engine/constants';
import type { Studio } from './useStudio';

const ICONS: Record<string, LucideIcon> = { sphere: Circle, lab: Sparkles, torus: Circle, terrain: Waves, grid: Grid2X2, dots: Grid2X2, diamond: Diamond, ribbon: Waves, helix: Waves };
function ShapeLibrary({ studio }: { studio: Studio }) {
  const [search, setSearch] = useState('');
  return <Section title="Shape library"><div className="search-field"><Search size={13} /><input aria-label="Search shapes" placeholder="Search shapes…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <div className="shape-grid">{SHAPES.filter((shape) => label(shape).toLowerCase().includes(search.toLowerCase())).map((shape) => {
      const Icon = ICONS[shape] ?? Box;
      return <button key={shape} className={`shape-tile ${studio.selected.state.shape === shape ? 'selected' : ''}`} onClick={() => studio.editScene({ shape })} aria-label={`Use ${label(shape)} shape`}><Icon size={21} strokeWidth={1.3} /><span>{label(shape)}</span></button>;
    })}</div>
  </Section>;
}
export function Library({ studio }: { studio: Studio }) {
  return <aside className="library"><div className="panel-heading"><Layers size={14} /><span>Experience</span><span className="badge">01</span></div>
    <div className="experience-label"><span className="field-dot" /><span>Particle field</span><Shapes size={14} /></div>
    <Section title="Director sequence"><div className="frame-list">{studio.project.keyframes.map((frame, index) =>
      <button key={frame.id} className={`frame-row ${studio.selected.id === frame.id ? 'selected' : ''}`} onClick={() => studio.selectFrame(frame)}>
        <span className="frame-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{frame.label}</strong><small>{label(frame.state.shape)}</small></span><code>{Math.round(frame.at * 100)}%</code>
      </button>)}</div></Section>
    <ShapeLibrary studio={studio} />
    <Section title="Project settings" defaultOpen={false}>
      <Range label="Particle count" value={studio.project.particleCount} min={LIMITS.countMin} max={LIMITS.countMax} step={LIMITS.countStep} onChange={(particleCount) => studio.update({ ...studio.project, particleCount })} />
      <Range label="Duration" value={studio.project.duration} min={1} max={60} step={1} unit="s" onChange={(duration) => studio.update({ ...studio.project, duration })} />
      <label className="check-control"><input type="checkbox" checked={studio.project.loop} onChange={(event) => studio.update({ ...studio.project, loop: event.target.checked })} />Loop playback</label>
    </Section>
    <div className="library-note"><Sparkles size={14} /><p>Shape is where particles rest.<br />Style is how they move.</p></div>
  </aside>;
}
