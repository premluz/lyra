import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { join } from 'node:path';

const source = process.argv[2] ?? '../ghostthemeportfolio/ghost2/content/themes/thinkingisfree';
const text = await readFile(join(source, 'assets/js/shape-definitions.js'), 'utf8');
const context = vm.createContext({ window: {}, console: { log: () => undefined }, Float32Array });
vm.runInContext(text, context);
const names = ['SPHERE', 'LAB', 'HELIX', 'RIBBON', 'RIBBON_DISPERSED', 'RIBBON_DISPERSED_PULSE', 'TERRAIN', 'GRID', 'DOTS', 'TRIPLE_SPHERE', 'TORUS', 'DISPERSED', 'HERO_HELIX', 'COLLAPSE', 'VOLATILITY'];
const fixtures = {};
function digest(array) { return createHash('sha256').update(new Uint8Array(array.buffer)).digest('hex'); }
for (const name of names) for (const count of [1000, 1733]) {
  const shape = context.window[name];
  let seed = [...shape.key].reduce((hash, letter) => Math.imul(hash, 31) + letter.charCodeAt(0), 42) >>> 0;
  context.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  vm.runInContext('Math.random = random', context);
  const result = shape.generate(count);
  fixtures[`${shape.key}:${count}`] = Object.fromEntries(Object.entries(result).filter(([, value]) => value instanceof Float32Array).map(([key, value]) => [key, digest(value)]));
}
await mkdir('tests/fixtures', { recursive: true });
await writeFile('tests/fixtures/original-shapes.json', JSON.stringify(fixtures, null, 2), { flag: 'wx' });
console.log('Recorded original geometry for 15 shapes at two distinct particle counts.');
