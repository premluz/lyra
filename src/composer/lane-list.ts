import { element } from '../ui';
import { COMPOSE } from './config';
import { instrumentFor } from '../audio/instruments';
import type { Score } from './model';
import { roleDefinition, isContinuous, isAudible } from './lanes';
import { svg } from './waves';

const SPEAKER_ICON = {
  body: 'M4 10v4h3l4 3V7l-4 3H4',
  playing: 'M14 9a4 4 0 0 1 0 6M16.5 6.5a7.5 7.5 0 0 1 0 11',
  muted: 'm14 10 5 5m0-5-5 5',
} as const;

interface LaneItem {
  wrapper: HTMLDivElement;
  button: HTMLButtonElement;
  audio: HTMLButtonElement;
  signal: SVGPathElement;
  title: HTMLSpanElement;
  detail: HTMLSpanElement;
}

export class LaneList {
  private host = element('lanes', HTMLDivElement);
  private add = element('add-lane', HTMLButtonElement);
  private binaural = document.createElement('button');
  private buttons = new Map<string, LaneItem>();
  constructor(private score: Score) {
    this.add.addEventListener('click', () => score.addLane());
    this.binaural.type = 'button'; this.binaural.id = 'add-binaural'; this.binaural.className = 'randomise-button';
    this.binaural.textContent = 'Add binaural track'; this.binaural.title = 'Add a continuous stereo sine layer';
    this.binaural.addEventListener('click', () => {
      if (!score.state.ambientTools) score.setAmbientTools(true);
      score.addLane('binaural');
    });
    this.add.after(this.binaural);
  }
  update() {
    const lanes = this.score.state.lanes;
    for (const [id, item] of this.buttons) if (!lanes.some((lane) => lane.id === id)) { item.wrapper.remove(); this.buttons.delete(id); }
    for (const [index, lane] of lanes.entries()) {
      let item = this.buttons.get(lane.id);
      if (!item) {
        const wrapper = document.createElement('div'), button = document.createElement('button'), audio = document.createElement('button');
        const title = document.createElement('span'), detail = document.createElement('span'), icon = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
        const signal = svg('path'); wrapper.className = 'lane-item'; audio.type = 'button'; audio.className = 'lane-audio-toggle';
        button.type = 'button'; detail.className = 'lane-detail'; button.append(title, detail);
        icon.append(svg('path', { d: SPEAKER_ICON.body }), signal); audio.append(icon); wrapper.append(button, audio);
        button.addEventListener('click', () => this.score.select(lane.id));
        audio.addEventListener('click', () => this.score.toggleLane(lane.id));
        item = { wrapper, button, audio, signal, title, detail }; this.buttons.set(lane.id, item); this.host.append(wrapper);
      }
      if (this.host.children[index] !== item.wrapper) this.host.insertBefore(item.wrapper, this.host.children[index] ?? null);
      item.wrapper.hidden = isContinuous(lane) && !this.score.state.ambientTools;
      item.button.className = `lane-tab lane-${lane.role}`; item.title.textContent = lane.name;
      item.detail.textContent = `${roleDefinition(lane.role).label} / ${instrumentFor(lane.instrument).label}`;
      item.button.setAttribute('aria-label', `Select ${lane.name}`); item.button.setAttribute('aria-pressed', String(lane.id === this.score.state.selected));
      item.button.dataset.empty = String(!isContinuous(lane) && lane.notes.every((note) => note === null));
      item.button.dataset.enabled = String(isAudible(lane, this.score.state.ambientTools));
      item.audio.setAttribute('aria-label', `${lane.enabled ? 'Mute' : 'Unmute'} ${lane.name}`);
      item.audio.setAttribute('aria-pressed', String(!lane.enabled)); item.audio.title = `${lane.enabled ? 'Mute' : 'Unmute'} ${lane.name}`;
      item.audio.dataset.muted = String(!lane.enabled); item.signal.setAttribute('d', lane.enabled ? SPEAKER_ICON.playing : SPEAKER_ICON.muted);
    }
    this.add.disabled = lanes.length >= COMPOSE.maxLanes; this.binaural.disabled = this.add.disabled;
    this.add.textContent = this.add.disabled ? `${COMPOSE.maxLanes} sounds` : 'Add sound track';
    const hidden = this.score.state.ambientTools ? 0 : lanes.filter(isContinuous).length;
    this.add.title = `${lanes.length} / ${COMPOSE.maxLanes} sound waves${hidden ? `; ${hidden} are under Ambient tools` : ''}`;
  }
}
