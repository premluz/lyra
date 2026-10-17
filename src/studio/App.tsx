import { useEffect } from 'react';
import { Boxes, ChevronRight, Film, MousePointer2, X } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { Header, StatusBar } from './Header';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Stage } from './Stage';
import { Timeline } from './Timeline';
import { useStudio } from './useStudio';
import type { Studio } from './useStudio';
import type { Project } from '../engine/types';

function useShortcuts(studio: Studio) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) studio.redo(); else studio.undo(); }
      if (event.code === 'Space') { event.preventDefault(); studio.setPlaying(!studio.playing); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [studio.playing, studio.undo, studio.redo]);
}

function WorkbenchTabs({ studio }: { studio: Studio }) {
  return <div className="workbench-tabs"><div className="mode-tabs" role="tablist" aria-label="Workbench mode">
    <button role="tab" aria-selected={!studio.preview} className={!studio.preview ? 'selected' : ''} onClick={() => studio.setPreview(false)}><MousePointer2 size={13} />Compose</button>
    <button role="tab" aria-selected={studio.preview} className={studio.preview ? 'selected' : ''} onClick={() => { studio.setPreview(true); studio.setPlaying(false); studio.setProgress(0); }}><Film size={13} />Scroll preview</button>
  </div><div className="breadcrumb"><Boxes size={12} /><span>Experience</span><ChevronRight size={11} /><strong>{studio.selected.label}</strong></div><span className="workbench-hint">SHAPE × STYLE × DIRECTION</span></div>;
}

export function App({ initial, initialError }: { initial: Project; initialError: string }) {
  const studio = useStudio(initial, initialError);
  useShortcuts(studio);
  return <Tooltip.Provider delayDuration={400}><div className="studio-app">
    <Header studio={studio} /><WorkbenchTabs studio={studio} />
    <main className="workbench"><Library studio={studio} /><div className="center-workbench"><Stage studio={studio} /><Timeline studio={studio} /></div><Inspector studio={studio} /></main>
    {studio.error && <div className="error-banner" role="alert"><span>{studio.error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => studio.setError('')}><X size={14} /></button></div>}
    <StatusBar studio={studio} />
  </div></Tooltip.Provider>;
}
