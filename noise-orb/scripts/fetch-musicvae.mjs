import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const source = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small';
const destination = resolve(import.meta.dirname, '../public/models/musicvae');
async function fetchFile(name) {
  const response = await fetch(`${source}/${name}`);
  if (!response.ok) throw new Error(`MusicVAE ${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer()), path = resolve(destination, name);
  try {
    const existing = await readFile(path);
    if (!existing.equals(bytes)) throw new Error(`Existing model asset differs: ${path}`);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
    await writeFile(path, bytes);
  }
  return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
await mkdir(destination, { recursive: true });
const configuration = await fetchFile('config.json'), manifestFile = await fetchFile('weights_manifest.json');
const manifest = JSON.parse(await readFile(resolve(destination, manifestFile.name), 'utf8'));
const shards = [...new Set(manifest.flatMap(group => group.paths))];
if (!shards.every(name => /^group\d+-shard\d+of\d+$/.test(name))) throw new Error('Unexpected model shard path');
const files = [configuration, manifestFile, ...await Promise.all(shards.map(fetchFile))];
const provenance = { source, model: 'mel_2bar_small', files };
await writeFile(resolve(destination, 'source.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(`Verified ${files.length} MusicVAE assets (${files.reduce((sum, file) => sum + file.bytes, 0)} bytes).`);
