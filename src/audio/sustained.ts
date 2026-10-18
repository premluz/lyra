import type { AudioGraph } from './graph';
import type { SustainedFrame, SustainedLane } from './sustain-config';
import { SustainVoice } from './sustain-voice';
import type { ContinuousVoice } from './sustain-voice';
import { BinauralVoice } from './binaural';

interface ActiveVoice { voice: ContinuousVoice; lane: SustainedLane; signature: string }
export class SustainedBank {
  private active = new Map<string, ActiveVoice>();
  constructor(private context: BaseAudioContext, private graph: AudioGraph) {}
  sync(frame: SustainedFrame, time: number) {
    this.graph.configureSpace(frame.spaceSeconds, frame.wet);
    for (const [id, active] of this.active) {
      const next = frame.lanes.find((lane) => lane.id === id);
      if (!next || next.kind !== active.lane.kind || next.instrument !== active.lane.instrument) {
        active.voice.release(time); this.active.delete(id);
      }
    }
    for (const lane of frame.lanes) {
      const active = this.active.get(lane.id), signature = JSON.stringify(lane);
      if (!active) {
        const voice = lane.kind === 'binaural' ? new BinauralVoice(this.context, this.graph.clean, lane, time) : new SustainVoice(this.context, this.graph.mix, lane, time);
        this.active.set(lane.id, { voice, lane, signature });
      } else if (signature !== active.signature) {
        active.voice.update(lane, time); active.lane = lane; active.signature = signature;
      }
    }
  }
}
