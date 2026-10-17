import JSZip from 'jszip';
import { MODEL_FILES } from '../engine/constants';
import type { Project } from '../engine/types';
import { DEMO_CSS, DEMO_JS, demoHtml } from './exportTemplate';

async function asset(path: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Export asset "${path}" failed (${response.status}). Run npm run build to generate the runtime.`);
  const buffer = await response.arrayBuffer();
  if (response.headers.get('content-type')?.includes('text/html')) throw new Error(`Export runtime is missing: ${path}. Restart with npm run dev.`);
  return buffer;
}
export async function exportExperience(project: Project) {
  const zip = new JSZip();
  zip.file('experience.json', JSON.stringify(project, null, 2));
  zip.file('particle-runtime.js', await asset('runtime/particle-runtime.js'));
  zip.file('index.html', demoHtml()); zip.file('demo.css', DEMO_CSS); zip.file('demo.js', DEMO_JS);
  const files = new Set(project.keyframes.flatMap((frame) => {
    const file = Object.entries(MODEL_FILES).find(([name]) => name === frame.state.shape)?.[1];
    return file ? [file] : [];
  }));
  await Promise.all([...files].map(async (file) => zip.file(`models/${file}.glb`, await asset(`models/${file}.glb`))));
  zip.file('README.md', '# Particle experience\n\nServe this folder over HTTP, for example `python3 -m http.server 8080`, and open http://localhost:8080.\n\nThe runtime bundles Three.js and GSAP. No Ghost, CDN, React, or external network is required.\n\nReuse mountParticles from particle-runtime.js; demo.js shows scroll playback. Keep the host sized in CSS. Call destroy() when removing it. Imported GLB assets remain in models/.\n');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
