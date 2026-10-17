import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public/runtime',
    emptyOutDir: false,
    lib: { entry: 'src/embed.ts', name: 'ParticleStudio', formats: ['es'], fileName: () => 'particle-runtime.js' },
  },
});
