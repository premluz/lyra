import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

const MIME: Record<string, string> = { html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json', glb: 'model/gltf-binary' };

test('downloaded bundle renders its model on an independent origin without Ghost or CDN', async ({ page, context }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  await page.getByLabel('Rest shape', { exact: true }).selectOption('mobile');
  await expect(page.getByText('Renderer ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export experience', exact: true }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download website bundle', exact: true }).click();
  const download = await promise, path = testInfo.outputPath('experience.zip');
  await download.saveAs(path);
  const zip = await JSZip.loadAsync(await readFile(path));
  expect(zip.file('models/mobile.glb')).not.toBeNull();
  expect(zip.file('particle-runtime.js')).not.toBeNull();
  const demo = await context.newPage(), errors: string[] = [], remote: string[] = [];
  demo.on('pageerror', (error) => errors.push(error.message));
  await demo.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://particle-export.test') { remote.push(url.href); await route.abort(); return; }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1), file = zip.file(name);
    if (!file) { await route.fulfill({ status: 404, body: `Missing export asset: ${name}` }); return; }
    await route.fulfill({ body: await file.async('nodebuffer'), contentType: MIME[name.split('.').pop() ?? ''] ?? 'application/octet-stream' });
  });
  await demo.goto('http://particle-export.test/');
  await expect(demo.locator('canvas')).toBeVisible();
  await expect(demo.locator('#error')).toHaveText('');
  await demo.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await demo.getByRole('button', { name: 'Toggle background', exact: true }).click();
  await expect(demo.locator('body')).toHaveClass('light');
  expect(errors).toEqual([]); expect(remote).toEqual([]);
});
