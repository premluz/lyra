export function element<T extends HTMLElement>(id: string, type: { new(): T }) {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Noise Orb is missing #${id}.`);
  return node;
}
export const ui = {
  root: element('instrument', HTMLElement), mesh: element('mesh', HTMLDivElement),
  sound: element('sound', HTMLButtonElement), label: element('sound-label', HTMLSpanElement),
  hint: element('sound-hint', HTMLSpanElement), status: element('status', HTMLParagraphElement),
  exit: element('exit', HTMLButtonElement), overlay: element('exit-overlay', HTMLDivElement),
  back: element('return', HTMLButtonElement),
};
export function report(error: unknown) {
  console.error('Noise Orb:', error);
  ui.status.textContent = `Something needs attention: ${error instanceof Error ? error.message : String(error)}`;
}
export function soundState(started: boolean, muted: boolean, state: string) {
  ui.root.dataset.audio = state; ui.root.dataset.muted = String(muted);
  ui.sound.setAttribute('aria-label', started ? (muted ? 'Unmute sound' : 'Mute sound') : 'Start sound');
  if (started) ui.sound.setAttribute('aria-pressed', String(!muted));
  else ui.sound.removeAttribute('aria-pressed');
  ui.label.textContent = started && muted ? 'Sound off' : 'Sound on';
  ui.hint.textContent = started ? 'Made to be felt. Take your time.' : 'Your first touch starts the music';
  ui.root.dataset.started = String(started);
}
