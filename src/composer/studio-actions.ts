import { element, ui } from '../ui';
import { svg } from './waves';

const EXPORT_ICON = { viewBox: '0 0 24 24', path: 'M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4' } as const;

export class StudioActions {
  constructor() {
    const composer = element('composer', HTMLElement), row = document.createElement('div');
    const dock = document.createElement('div'), button = document.createElement('button');
    dock.className = 'studio-dock'; row.className = 'studio-bottom-actions';
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Sound, export and settings');
    button.type = 'button'; button.className = 'focus-settings-toggle'; button.setAttribute('aria-controls', composer.id);
    row.append(this.soundControl(), this.exportControl(), button); dock.append(row, composer); ui.root.append(dock);
    this.compositionActions();
    const wrapped = element('wrapped-waves', HTMLDivElement);
    const update = () => {
      const expanded = ui.root.dataset.focusMode !== 'true';
      button.textContent = expanded ? 'Hide settings' : 'Show settings';
      button.setAttribute('aria-expanded', String(expanded));
      composer.hidden = !expanded; composer.inert = !expanded || ui.root.dataset.exited === 'true';
      wrapped.inert = !expanded; wrapped.setAttribute('aria-hidden', String(!expanded));
    };
    button.addEventListener('click', () => { ui.root.dataset.focusMode = String(ui.root.dataset.focusMode !== 'true'); update(); });
    update();
  }

  private soundControl() {
    const control = ui.sound.closest('.sound-control');
    if (!(control instanceof HTMLElement)) throw new Error('Studio actions need the sound control.');
    ui.sound.classList.add('studio-icon-button'); ui.label.classList.add('sr-only');
    return control;
  }

  private exportControl() {
    const wrapper = document.createElement('div'), button = element('export-setup', HTMLButtonElement);
    const icon = svg('svg', { viewBox: EXPORT_ICON.viewBox, 'aria-hidden': 'true' });
    const menu = document.createElement('div'), source = document.createElement('button'), mp3 = document.createElement('button');
    icon.append(svg('path', { d: EXPORT_ICON.path }));
    button.replaceChildren(icon); button.classList.add('studio-icon-button'); button.setAttribute('aria-label', 'Export');
    button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-controls', 'export-menu');
    wrapper.className = 'studio-export'; menu.id = 'export-menu'; menu.className = 'studio-export-menu';
    menu.setAttribute('role', 'menu'); menu.hidden = true;
    source.type = 'button'; source.id = 'export-source'; source.textContent = 'Source file'; source.setAttribute('role', 'menuitem');
    mp3.type = 'button'; mp3.id = 'export-mp3'; mp3.textContent = 'MP3'; mp3.setAttribute('role', 'menuitem');
    menu.append(source, mp3); wrapper.append(button, menu);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => { menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); });
    menu.addEventListener('click', (event) => {
      if (!(event.target instanceof HTMLButtonElement)) return;
      menu.hidden = true; button.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof Node) || wrapper.contains(event.target)) return;
      menu.hidden = true; button.setAttribute('aria-expanded', 'false');
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      menu.hidden = true; button.setAttribute('aria-expanded', 'false');
    });
    return wrapper;
  }

  private compositionActions() {
    const actions = document.querySelector('.composer-actions');
    if (!(actions instanceof HTMLElement)) throw new Error('Studio actions need the composition toolbar.');
    const randomise = element('randomise', HTMLButtonElement), add = element('add-lane', HTMLButtonElement);
    const remove = element('remove-wave', HTMLButtonElement);
    remove.textContent = 'Remove track';
    add.classList.replace('lane-toggle', 'randomise-button'); remove.classList.replace('lane-toggle', 'randomise-button');
    actions.prepend(randomise, add, remove);
  }
}
