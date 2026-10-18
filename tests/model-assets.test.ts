import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { record } from '../src/composer/storage';

test('the local MusicVAE checkpoint matches its recorded file sizes and SHA-256 digests', async () => {
  const root = resolve('public/models/musicvae');
  const provenance: unknown = JSON.parse(await readFile(resolve(root, 'source.json'), 'utf8'));
  if (!record(provenance) || !Array.isArray(provenance.files)) throw new Error('Invalid model provenance');
  expect(provenance.files).toHaveLength(7);
  for (const file of provenance.files) {
    if (!record(file) || typeof file.name !== 'string' || typeof file.sha256 !== 'string' || typeof file.bytes !== 'number') throw new Error('Invalid model file manifest');
    const data = await readFile(resolve(root, file.name));
    expect(data.length).toBe(file.bytes);
    expect(createHash('sha256').update(data).digest('hex')).toBe(file.sha256);
  }
});
