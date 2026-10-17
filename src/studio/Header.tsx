import { useRef } from 'react';
import { Aperture, ArrowUpFromLine, Check, Command, Redo2, Undo2 } from 'lucide-react';
import { IconButton } from './ui';
import { ExportDialog } from './ExportDialog';
import { readProject, message } from './files';
import type { Studio } from './useStudio';

export function Header({ studio }: { studio: Studio }) {
  const input = useRef<HTMLInputElement>(null);
  return <header className="app-header"><div className="brand"><span className="brand-symbol"><Aperture size={21} /></span><span>particle<span className="brand-secondary">studio</span></span><span className="internal-badge">INTERNAL</span></div>
    <div className="project-title"><input aria-label="Project name" value={studio.project.name} maxLength={80} onChange={(event) => { if (event.target.value.trim()) studio.update({ ...studio.project, name: event.target.value }); }} /><span className="saved-state">{studio.saved ? <Check size={11} /> : <span className="save-dot" />}{!studio.saveEnabled ? 'Autosave paused' : studio.saved ? 'Saved locally' : 'Saving…'}</span></div>
    <div className="header-actions"><IconButton icon={Undo2} label="Undo (⌘Z)" onClick={studio.undo} disabled={!studio.canUndo} /><IconButton icon={Redo2} label="Redo (⌘⇧Z)" onClick={studio.redo} disabled={!studio.canRedo} /><span className="divider" />
      <button className="small-button" onClick={() => input.current?.click()}><ArrowUpFromLine size={14} />Open</button>
      <input className="file-input" ref={input} type="file" accept=".json,application/json" aria-label="Open project file" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) readProject(file).then((project) => { studio.update(project); studio.selectFrame(project.keyframes[0]); studio.setSaveEnabled(true); studio.setError(''); }).catch((error: unknown) => studio.setError(message(error)));
        event.target.value = '';
      }} /><ExportDialog studio={studio} /></div>
  </header>;
}
export function StatusBar({ studio }: { studio: Studio }) {
  return <footer className="status-bar"><span><span className="live-dot" /> LOCAL WORKSPACE</span><span>{studio.project.keyframes.length} keyframes <span className="status-separator">/</span> {studio.project.particleCount.toLocaleString()} particles</span><span className="status-shortcuts"><Command size={11} /> Z undo <span>·</span> Space play / pause</span><span>PARTICLE STUDIO <span className="status-separator">/</span> 0.1</span></footer>;
}
