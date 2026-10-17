import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './studio/App';
import { createProject } from './engine/defaults';
import { parseProject } from './engine/validation';
import { STUDIO } from './studio/constants';
import { message } from './studio/files';
import './styles/tokens.css';
import './styles/shell.css';
import './styles/controls.css';
import './styles/stage.css';
import './styles/timeline.css';
import './styles/dialog.css';

function initialState() {
  try {
    const saved = localStorage.getItem(STUDIO.storage);
    return { initial: saved ? parseProject(JSON.parse(saved)) : createProject(), initialError: '' };
  } catch (error) {
    return { initial: createProject(), initialError: `Saved project could not be opened: ${message(error)}. Autosave is paused to preserve it. Open a valid project file to resume.` };
  }
}
const root = document.getElementById('root');
if (!root) throw new Error('Particle Studio root element is missing.');
createRoot(root).render(<StrictMode><App {...initialState()} /></StrictMode>);
