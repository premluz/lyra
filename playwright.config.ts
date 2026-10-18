import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: /.*\.spec\.ts/, workers: 1, timeout: 60000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.005 } },
  use: {
    baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 960 },
    launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI },
  reporter: 'list',
});
