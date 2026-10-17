export const STUDIO = {
  storage: 'particle-studio.project.v1', themeStorage: 'particle-studio.theme.v1',
  frameRate: 30, timelineResolution: 1000, percent: 100, autosaveMs: 400,
  maxHistory: 50, importMaxBytes: 1024 * 1024, toastMs: 4000,
} as const;
export const LABELS: Record<string, string> = {
  lab: 'Noise orb', terrain: 'Terrain', volatility: 'Volatility', helix: 'Helix flow',
  'ribbon-dispersed-pulse': 'Ribbon pulse', grid: 'Interactive waves', none: 'Static',
  'hero-helix': 'Perspective coil', 'ribbon-dispersed': 'Scattered ribbon',
  'triple-sphere': 'Triple sphere', 'idle-drift': 'Idle drift', 'pointer-field': 'Pointer field',
  'free-float': 'Free float', bokeh: 'Glow', halftone: 'Halftone',
};
export function label(key: string) { return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1); }
