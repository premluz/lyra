import { SlidersHorizontal } from 'lucide-react';
import { EASES, MOTIONS, SHAPES } from '../engine/types';
import type { Vec3 } from '../engine/types';
import { styleUniforms } from '../engine/extracted/uniforms';
import { LIMITS } from '../engine/constants';
import { FIELD_KNOBS, HALFTONE_KNOBS, MOTION_KNOBS } from './knobs';
import type { Knob } from './knobs';
import { Range, Section, Select } from './ui';
import { label } from './constants';
import type { Studio } from './useStudio';

function UniformKnobs({ studio, knobs }: { studio: Studio; knobs: Knob[] }) {
  const defaults = styleUniforms();
  return <>{knobs.map((knob) => {
    const uniform = Object.entries(defaults).find(([name]) => name === knob.key)?.[1];
    const fallback = uniform && typeof uniform.value === 'number' ? uniform.value : 0;
    return <Range key={knob.key} label={knob.label} min={knob.min} max={knob.max} value={studio.selected.state.uniforms[knob.key] ?? fallback}
      onChange={(value) => studio.editScene({ uniforms: { ...studio.selected.state.uniforms, [knob.key]: value } })} />;
  })}</>;
}

function VectorControl({ label, value, max, onChange }: { label: string; value: Vec3; max: number; onChange: (value: Vec3) => void }) {
  return <fieldset className="vector-control"><legend>{label}</legend>{(['X', 'Y', 'Z'] as const).map((axis, index) =>
    <label key={axis}><span>{axis}</span><input type="number" aria-label={`${label} ${axis}`} step={max > 100 ? 1 : 0.1} min={-max} max={max} value={Number(value[index].toFixed(2))} onChange={(event) => {
      if (!event.target.value || !Number.isFinite(event.target.valueAsNumber)) return;
      const next: Vec3 = [...value]; next[index] = Math.max(-max, Math.min(max, event.target.valueAsNumber)); onChange(next);
    }} /></label>)}</fieldset>;
}

function FrameSettings({ studio }: { studio: Studio }) {
  const index = studio.project.keyframes.findIndex((frame) => frame.id === studio.selected.id);
  const locked = index === 0 || index === studio.project.keyframes.length - 1;
  const min = locked ? studio.selected.at : studio.project.keyframes[index - 1].at + LIMITS.frameGap;
  const max = locked ? studio.selected.at : studio.project.keyframes[index + 1].at - LIMITS.frameGap;
  return <Section title="Keyframe">
    <label className="text-control">Name<input aria-label="Keyframe name" maxLength={80} value={studio.selected.label} onChange={(event) => { if (event.target.value.trim()) studio.editFrame({ label: event.target.value }); }} /></label>
    {!locked && <Range label="At progress" value={studio.selected.at * 100} min={min * 100} max={max * 100} step={0.5} unit="%" onChange={(value) => { studio.editFrame({ at: value / 100 }); studio.setProgress(value / 100); }} />}
    <Select label="Transition ease" value={studio.selected.ease} options={EASES.map((value) => ({ value, label: value === 'none' ? 'Linear' : value }))} onChange={(ease) => studio.editFrame({ ease })} />
  </Section>;
}

function Appearance({ studio }: { studio: Studio }) {
  const state = studio.selected.state;
  return <Section title="Appearance">
    <Select label="Render treatment" value={state.renderStyle} options={[{ value: 'glow', label: 'Hexagonal glow' }, { value: 'halftone', label: 'Halftone ink' }]} onChange={(renderStyle) => studio.editScene({ renderStyle })} />
    <div className="color-row"><label>Particle color<input aria-label="Particle color" type="color" value={state.color} onChange={(event) => studio.editScene({ color: event.target.value })} /></label><code>{state.color.toUpperCase()}</code></div>
    <div className="color-row"><label>Wave color<input aria-label="Wave color" type="color" value={state.waveColor} onChange={(event) => studio.editScene({ waveColor: event.target.value })} /></label><code>{state.waveColor.toUpperCase()}</code></div>
    <Range label="Particle size" value={state.size} min={0.05} max={5} onChange={(size) => studio.editScene({ size })} />
    <Range label="Opacity" value={state.opacity} min={0} max={1} onChange={(opacity) => studio.editScene({ opacity })} />
    {state.renderStyle === 'halftone' && <UniformKnobs studio={studio} knobs={HALFTONE_KNOBS} />}
  </Section>;
}

export function Inspector({ studio }: { studio: Studio }) {
  const state = studio.selected.state;
  return <aside className="inspector"><div className="panel-heading"><SlidersHorizontal size={14} /><span>Inspector</span><span className="badge">KEYFRAME</span></div>
    <FrameSettings studio={studio} />
    <Section title="Shape & motion">
      <Select label="Rest shape" value={state.shape} options={SHAPES.map((value) => ({ value, label: label(value) }))} onChange={(shape) => studio.editScene({ shape })} />
      <Select label="Motion shader" value={state.motion} options={MOTIONS.map((value) => ({ value, label: label(value) }))} onChange={(motion) => studio.editScene({ motion })} />
      <UniformKnobs studio={studio} knobs={MOTION_KNOBS[state.motion] ?? []} />
    </Section>
    <Appearance studio={studio} />
    <Section title="Transform">
      <VectorControl label="Position" value={state.position} max={20} onChange={(position) => studio.editScene({ position })} />
      <VectorControl label="Rotation" value={state.rotation} max={360} onChange={(rotation) => studio.editScene({ rotation })} />
      <Range label="Scale" value={state.scale} min={0.05} max={3} onChange={(scale) => studio.editScene({ scale })} />
      <Range label="Camera distance" value={state.cameraZ} min={3} max={40} onChange={(cameraZ) => studio.editScene({ cameraZ })} />
    </Section>
    <Section title="Interaction & drift" defaultOpen={false}><UniformKnobs studio={studio} knobs={FIELD_KNOBS} /></Section>
  </aside>;
}
