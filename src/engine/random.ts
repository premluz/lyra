let seed = 42;
export function setSeed(value: number) { seed = value >>> 0; }
export function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
export function shapeSeed(key: string, projectSeed: number) {
  return [...key].reduce((hash, letter) => Math.imul(hash, 31) + letter.charCodeAt(0), projectSeed) >>> 0;
}
