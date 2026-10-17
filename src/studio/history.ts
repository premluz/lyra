import { useCallback, useState } from 'react';
import { STUDIO } from './constants';
import type { Project } from '../engine/types';

interface History { past: Project[]; current: Project; future: Project[] }
export function useHistory(initial: Project) {
  const [history, setHistory] = useState<History>({ past: [], current: initial, future: [] });
  const update = useCallback((next: Project | ((current: Project) => Project)) => {
    setHistory((state) => {
      const current = typeof next === 'function' ? next(state.current) : next;
      if (JSON.stringify(current) === JSON.stringify(state.current)) return state;
      return { past: [...state.past, state.current].slice(-STUDIO.maxHistory), current, future: [] };
    });
  }, []);
  const undo = useCallback(() => setHistory((state) => {
    if (!state.past.length) return state;
    return { past: state.past.slice(0, -1), current: state.past[state.past.length - 1], future: [state.current, ...state.future] };
  }), []);
  const redo = useCallback(() => setHistory((state) => {
    if (!state.future.length) return state;
    return { past: [...state.past, state.current], current: state.future[0], future: state.future.slice(1) };
  }), []);
  return { project: history.current, update, undo, redo, canUndo: !!history.past.length, canRedo: !!history.future.length };
}
