import { element } from '../ui';
import { COMPOSE } from './config';
import { instrumentFor } from '../audio/instruments';
import type { Score } from './model';
import { roleDefinition, isContinuous, isAudible } from './lanes';

export class LaneList {
  private host = element('lanes', HTMLDivElement);
  private add = element('add-lane', HTMLButtonElement);
  private binaural = document.createElement('button');
  private buttons = new Map<string, { button: HTMLButtonElement; title: HTMLSpanElement; detail: HTMLSpanElement }>();
  constructor(private score: Score) {
    this.add.addEventListener('click', () => score.addLane());
    this.binaural.type = 'button'; this.binaural.id = 'add-binaural'; this.binaural.className = 'randomise-button';
    this.binaural.textContent = 'Add binaural'; this.binaural.title = 'Add a continuous stereo sine layer';
    this.binaural.addEventListener('click', () => {
      if (!score.state.ambientTools) score.setAmbientTools(true);
      score.addLane('binaural');
    });
    this.add.after(this.binaural);
  }
  update() {
    const lanes = this.score.state.lanes;
    for (const [id, item] of this.buttons) if (!lanes.some((lane) => lane.id === id)) { item.button.remove(); this.buttons.delete(id); }
    for (const [index, lane] of lanes.entries()) {
      let item = this.buttons.get(lane.id);
      if (!item) {
        const button = document.createElement('button'), title = document.createElement('span'), detail = document.createElement('span');
        button.type = 'button'; detail.className = 'lane-detail'; button.append(title, detail);
        button.addEventListener('click', () => this.score.select(lane.id));
        item = { button, title, detail }; this.buttons.set(lane.id, item); this.host.append(button);
      }
      if (this.host.children[index] !== item.button) this.host.insertBefore(item.button, this.host.children[index] ?? null);
      item.button.hidden = isContinuous(lane) && !this.score.state.ambientTools;
      item.button.className = `lane-tab lane-${lane.role}`; item.title.textContent = lane.name;
      item.detail.textContent = `${roleDefinition(lane.role).label} / ${instrumentFor(lane.instrument).label}`;
      item.button.setAttribute('aria-label', `Select ${lane.name}`); item.button.setAttribute('aria-pressed', String(lane.id === this.score.state.selected));
      item.button.dataset.empty = String(!isContinuous(lane) && lane.notes.every((note) => note === null));
      item.button.dataset.enabled = String(isAudible(lane, this.score.state.ambientTools));
    }
    this.add.disabled = lanes.length >= COMPOSE.maxLanes; this.binaural.disabled = this.add.disabled;
    this.add.textContent = this.add.disabled ? `${COMPOSE.maxLanes} sounds` : 'Add sound';
    const hidden = this.score.state.ambientTools ? 0 : lanes.filter(isContinuous).length;
    this.add.title = `${lanes.length} / ${COMPOSE.maxLanes} sound waves${hidden ? `; ${hidden} are under Ambient tools` : ''}`;
  }
}
