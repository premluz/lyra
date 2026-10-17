import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
const magentaWorkerCompat = {
  name: 'magenta-worker-compat',
  resolveId(source: string, importer: string | undefined) {
    return importer?.includes('/@magenta/music/') && /(?:^|\/)compat\/global(?:\.js)?$/.test(source)
      ? resolve(import.meta.dirname, 'src/magenta/compat.ts') : null;
  },
};
export default defineConfig({
  base: './',
  resolve: { alias: [{ find: /^(?:\.\.\/core\/|\.\/)compat\/global$/, replacement: resolve(import.meta.dirname, 'src/magenta/compat.ts') }] },
  optimizeDeps: { include: ['@tensorflow/tfjs', '@magenta/music/esm/music_vae/model'], rolldownOptions: { plugins: [magentaWorkerCompat] } },
  build: { rolldownOptions: { input: { orb: resolve(import.meta.dirname, 'index.html'), shape: resolve(import.meta.dirname, 'shape.html'), advancedV2: resolve(import.meta.dirname, 'advanced-v2.html'), advancedV3: resolve(import.meta.dirname, 'advanced-v3.html'), drawMusic: resolve(import.meta.dirname, 'draw-music.html'), draw: resolve(import.meta.dirname, 'draw.html'), sculpt: resolve(import.meta.dirname, 'sculpt.html'), aura: resolve(import.meta.dirname, 'aura.html') } } },
  worker: { format: 'es' },
  server: { port: 5174, strictPort: true, fs: { allow: ['..'] } },
  test: { include: ['tests/**/*.test.ts'] },
});
