import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
import * as THREE from 'three';
import ts from 'typescript';

const source = resolve(process.argv[2] ?? '../ghostthemeportfolio/ghost2/content/themes/thinkingisfree');
const target = process.argv[3];
if (!target) throw new Error('Provide a fresh output directory: node scripts/extract.mjs SOURCE OUTPUT.');
const files = ['shape-definitions.js', 'particle-style-definitions.js', 'particle-animation-loop.js'];
const texts = await Promise.all(files.map((file) => readFile(join(source, 'assets/js', file), 'utf8')));
const context = vm.createContext({ window: { THREE }, THREE, console: { log: () => undefined } });
vm.runInContext(texts[0], context);
vm.runInContext(texts[1], context);
const windowExports = context.window;
const styles = windowExports.createDefaultParticleStyleRegistry();
await mkdir(target);

function cleanShader(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    .split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

async function writeShader(name, text) {
  const lines = cleanShader(text).split('\n');
  const imports = [];
  for (let offset = 0; offset < lines.length; offset += 150) {
    const part = `${name}-${offset / 150}.glsl`;
    await writeFile(`${target}/${part}`, lines.slice(offset, offset + 150).join('\n'));
    imports.push(`import part${offset / 150} from './${part}?raw';`);
  }
  const values = imports.map((_, index) => `part${index}`).join(', ');
  await writeFile(`${target}/${name}.ts`, `${imports.join('\n')}\nexport default [${values}].join('\\n');\n`);
}

const shaderStart = texts[2].indexOf('const vertexShader =');
const shaderEnd = texts[2].indexOf('const mat =', shaderStart);
const shaders = vm.runInNewContext(`(() => { ${texts[2].slice(shaderStart, shaderEnd)} return { vertexShader, fragmentShader }; })()`, { styles });
await writeShader('vertex', shaders.vertexShader);
await writeShader('fragment', shaders.fragmentShader);

function serializeValue(value) {
  if (value instanceof THREE.Color) return `new Color(${value.getHex()})`;
  if (value instanceof THREE.Vector2) return `new Vector2(${value.x}, ${value.y})`;
  if (value instanceof THREE.Vector3) return `new Vector3(${value.x}, ${value.y}, ${value.z})`;
  return JSON.stringify(value);
}

const uniformLines = styles.all().flatMap((style) => Object.entries(style.uniforms)
  .map(([name, uniform]) => `  ${name}: { value: ${serializeValue(uniform.value)} },`));
const types = ['Color', 'Vector2', 'Vector3'].filter((type) => uniformLines.some((line) => line.includes(`new ${type}`)));
await writeFile(`${target}/uniforms.ts`, `import { ${types.join(', ')} } from 'three';\nexport function styleUniforms() {\n return {\n${uniformLines.join('\n')}\n };\n}\n`);
const metadata = styles.all().map(({ key, progressUniform, uniforms, materialState }) => ({
  key, progressUniform, materialState, uniforms: Object.keys(uniforms),
}));
await writeFile(`${target}/styles.ts`, `export const styleDefinitions = ${JSON.stringify(metadata, null, 0)} as const;\n`);

const shapeNames = ['SPHERE', 'LAB', 'HELIX', 'RIBBON', 'RIBBON_DISPERSED', 'RIBBON_DISPERSED_PULSE', 'TERRAIN', 'GRID', 'DOTS', 'TRIPLE_SPHERE', 'TORUS', 'DISPERSED', 'HERO_HELIX', 'COLLAPSE', 'VOLATILITY'];
const generators = new Map();
const shapes = shapeNames.map((name) => {
  const shape = windowExports[name];
  generators.set(shape.generator.name, shape.generator);
  return { key: shape.key, generator: shape.generator.name, config: shape.config };
});

function typedGenerator(name, generator) {
  const code = ts.transpileModule(`export const ${name} = ${generator.toString()};`, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true,
  } }).outputText.replace(/\s*console\.log\([^;]*\);/g, '');
  return code.replace(/\(particleCount, config\)/, '(particleCount: number, config: Record<string, number>)')
    .replace(/\((i|angle|t)\) =>/g, '($1: number) =>');
}

for (const [name, generator] of generators) {
  await writeFile(`${target}/${name}.ts`, typedGenerator(name, generator));
}
const generatorImports = [...generators.keys()].map((name) => `import { ${name} } from './${name}';`);
const shapeEntries = shapes.map(({ key, generator, config }) => ` { key: '${key}', generate: ${generator}, config: ${JSON.stringify(config)} },`);
await writeFile(`${target}/shapes.ts`, `${generatorImports.join('\n')}\nexport const shapeDefinitions = [\n${shapeEntries.join('\n')}\n];\n`);

await mkdir(`${target}/models`);
const models = ['mobile', 'note', 'diamond', 'globe', 'game', 'chart', 'email', 'camera', 'sim'];
for (const model of models) await copyFile(join(source, '../../images', `${model}.glb`), `${target}/models/${model}.glb`);
console.log(`Extracted ${shapes.length} shapes, ${styles.all().length} styles, ${models.length} models.`);
