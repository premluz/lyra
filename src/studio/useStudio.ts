import { useCallback, useEffect, useState } from 'react';
import { useHistory } from './history';
import { STUDIO } from './constants';
import type { Keyframe, Project, SceneState } from '../engine/types';

export function useStudio(initial: Project, initialError: string) {
  const history = useHistory(initial);
  const [selectedId, setSelectedId] = useState(initial.keyframes[0].id);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [light, setLight] = useState(false);
  const [preview, setPreview] = useState(false);
  const [grid, setGrid] = useState(true);
  const [error, setError] = useState(initialError);
  const [saved, setSaved] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(!initialError);
  const selected = history.project.keyframes.find((frame) => frame.id === selectedId) ?? history.project.keyframes[0];
  useEffect(() => {
    setSaved(false);
    if (!saveEnabled) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STUDIO.storage, JSON.stringify(history.project)); setSaved(true); }
      catch (failure) { setError(`Autosave failed: ${String(failure)}`); }
    }, STUDIO.autosaveMs);
    return () => clearTimeout(timer);
  }, [history.project, saveEnabled]);
  const selectFrame = useCallback((frame: Keyframe) => { setSelectedId(frame.id); setProgress(frame.at); setPlaying(false); }, []);
  const editFrame = (patch: Partial<Keyframe>) => history.update((project) => ({ ...project,
    keyframes: project.keyframes.map((frame) => frame.id === selected.id ? { ...frame, ...patch } : frame) }));
  const editScene = (patch: Partial<SceneState>) => {
    editFrame({ state: { ...selected.state, ...patch } }); setProgress(selected.at); setPlaying(false);
  };
  return { ...history, selected, progress, setProgress, playing, setPlaying, light, setLight, preview, setPreview,
    grid, setGrid, error, setError, saved, saveEnabled, setSaveEnabled, selectFrame, editFrame, editScene };
}
export type Studio = ReturnType<typeof useStudio>;
