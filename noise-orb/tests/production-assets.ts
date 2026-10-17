import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MIME: Record<string, string> = { html: 'text/html', js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', json: 'application/json' };
export async function serveProduction(page: Page) {
  const errors: string[] = [], remote: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://noise-orb.test') { remote.push(url.href); await route.abort(); return; }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    try {
      const body = await readFile(resolve('dist', name));
      await route.fulfill({ body, contentType: MIME[name.split('.').pop() ?? ''] ?? 'application/octet-stream' });
    } catch (error) { await route.fulfill({ status: 404, body: `Missing production asset ${name}: ${String(error)}` }); }
  });
  return { errors, remote };
}
