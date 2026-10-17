import { Slider, Tooltip } from 'radix-ui';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface IconButtonProps { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; active?: boolean }
export function IconButton({ icon: Icon, label, onClick, disabled = false, active = false }: IconButtonProps) {
  return <Tooltip.Root><Tooltip.Trigger asChild>
    <button className={`icon-button ${active ? 'active' : ''}`} aria-label={label} onClick={onClick} disabled={disabled}><Icon size={15} /></button>
  </Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={6}>{label}<Tooltip.Arrow /></Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}

interface RangeProps { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; unit?: string }
export function Range({ label, value, min, max, step = 0.01, onChange, unit = '' }: RangeProps) {
  return <label className="range-control"><span className="control-label">{label}<output>{Number(value.toFixed(2))}{unit}</output></span>
    <Slider.Root className="slider" value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next)}>
      <Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track><Slider.Thumb className="slider-thumb" aria-label={label} />
    </Slider.Root></label>;
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="inspector-section" open={defaultOpen}><summary>{title}</summary><div className="section-content">{children}</div></details>;
}
export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <label className="select-control"><span>{label}</span><select aria-label={label} value={value} onChange={(event) => {
    const selected = options.find((item) => item.value === event.target.value);
    if (selected) onChange(selected.value);
  }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
