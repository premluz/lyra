import { GESTURE, MUSIC, clamp } from '../config';
import { NotePolicy, SCALE, pitchAt } from '../score';
import type { NoteEvent, TouchPoint } from '../score';
import { AudioGraph } from './graph';
import { Layers } from './layers';
import { Voices } from './voices';
import { BeatClock } from './clock';
import type { SequenceNote, SequenceSource } from './sequence';
import { SustainedBank } from './sustained';
import { AudioMeter } from './meter';
import { HoverInstrument } from './hover';
import { voiceEnvelope } from './envelope';

interface Request { point: TouchPoint; velocity: number; tap: boolean }
interface BeatSlot { time: number; user: boolean; cancel: (() => void) | null; checkpoint: ReturnType<NotePolicy['checkpoint']> }
const CENTER: TouchPoint = { x: 0, z: 0, nx: 0.5, depth: 0.5 };
export class SoundEngine {
  private context: AudioContext | null = null;
  private graph: AudioGraph | null = null;
  private layers: Layers | null = null;
  private voices: Voices | null = null;
  private clock: BeatClock | null = null;
  private sustained: SustainedBank | null = null;
  private fadeEnd: number | null = null;
  private policy = new NotePolicy();
  private lanePolicies = new Map<string, NotePolicy>();
  private audition: SequenceNote | null = null;
  private pending: Request | null = null;
  private dragging: Request | null = null;
  private slot: BeatSlot | null = null;
  private activeUntil = 0;
  private waveform = new Float32Array(MUSIC.waveformSize);
  private meter = new AudioMeter();
  private hover: HoverInstrument | null;
  muted: boolean;
  constructor(private emit: (event: NoteEvent) => void, private report: (error: unknown) => void, private sequence?: SequenceSource, hoverInstrument = false) {
    this.hover = hoverInstrument ? new HoverInstrument(emit, (index) => this.sequence?.midi?.(index) ?? SCALE[index]) : null;
    this.muted = localStorage.getItem(MUSIC.muteKey) === 'true';
  }

  get started() { return this.context !== null; }
  get time() { return this.context?.currentTime ?? 0; }
  get state() { return this.context?.state ?? 'locked'; }
  get fadeComplete() { return this.fadeEnd !== null && this.time >= this.fadeEnd; }
  get analysis() { return this.meter.sample(this.graph?.analyser ?? null, this.context?.sampleRate ?? 0, this.muted || this.state !== 'running'); }
  fadeOut(seconds: number) { this.fadeEnd = this.graph?.fadeOut(seconds) ?? null; }
  get level() {
    if (!this.graph || this.muted) return 0;
    this.graph.analyser.getFloatTimeDomainData(this.waveform);
    return Math.sqrt(this.waveform.reduce((sum, value) => sum + value * value, 0) / this.waveform.length);
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.graph = new AudioGraph(this.context);
      if (!this.sequence?.authoredOnly) this.layers = new Layers(this.context, this.graph.mix, this.sequence?.continuous?.().legacyBed ?? true);
      this.voices = new Voices(this.context, this.graph.notes, () => this.sequence?.voiceLimit?.() ?? MUSIC.maxVoices, () => this.sequence?.tuning?.() ?? 1);
      this.hover?.connect(this.context, this.graph.notes, this.graph.mix, () => this.sequence?.tuning?.() ?? 1);
      if (this.sequence?.continuous) {
        this.sustained = new SustainedBank(this.context, this.graph);
        this.layers?.enable(this.sequence.continuous().legacyBed);
      }
      this.clock = new BeatClock(() => this.time, (time, tick) => this.schedule(time, tick));
    }
    await this.context.resume(); this.graph?.mute(this.muted); this.clock?.start();
  }

  request(point: TouchPoint, velocity: number, tap = false) {
    if (this.hover) { this.hover.request(point, velocity, tap); return; }
    if (this.sequence?.authoredOnly || this.sequence?.continuous?.().legacyBed === false) return;
    if (!this.pending?.tap || tap) this.pending = { point, velocity: clamp(velocity), tap };
    this.activeUntil = this.time + MUSIC.activeWindow;
    this.fillUpcoming(this.pending);
  }

  drag(point: TouchPoint, velocity: number, amount: number) {
    if (this.hover) { this.hover.drag(point, velocity); return; }
    if (this.sequence?.authoredOnly || this.sequence?.continuous?.().legacyBed === false) return;
    this.dragging = { point, velocity: Math.max(GESTURE.dragMinimum, velocity), tap: false };
    this.activeUntil = this.time + MUSIC.activeWindow;
    this.layers?.swell(amount, true);
    this.fillUpcoming(this.pending ?? this.dragging);
  }

  hoverAt(point: TouchPoint) { this.hover?.move(point); }
  press(point: TouchPoint) { this.hover?.press(point); }
  leave() { this.hover?.leave(); }
  release() { this.hover?.release(); this.dragging = null; this.layers?.swell(0, false); }
  preview(note: SequenceNote) { this.pending = null; this.audition = note; }
  immediate(note: SequenceNote) {
    if (!this.context || this.state !== 'running') return;
    const time = this.time, midi = this.sequence?.midi?.(note.index) ?? SCALE[note.index];
    const cancel = this.voices?.pluck(midi, time, note.velocity, note.point.depth, note.shape);
    if (cancel) this.emit({ ...note, time, midi, user: true, envelope: voiceEnvelope(note.shape) });
    return cancel;
  }

  private schedule(time: number, tick: number) {
    this.hover?.schedule(time, tick);
    const frame = this.sequence?.continuous?.();
    if (frame) { this.layers?.enable(frame.legacyBed); this.sustained?.sync(frame, time); }
    this.slot = { time, user: false, cancel: null, checkpoint: this.policy.checkpoint() };
    const plans = this.sequence?.schedule(time, tick);
    if (this.audition) {
      const note = this.audition; this.audition = null;
      this.play(note.index, time, note.velocity, note.point, true, note); return;
    }
    const request = this.pending ?? this.dragging;
    this.pending = null;
    if (request) {
      this.play(pitchAt(request.point, request.tap), time, request.velocity, request.point, true);
      return;
    }
    if (plans) {
      for (const note of plans) this.play(note.index, time + (note.delay ?? 0), note.velocity, note.point, true, note);
      return;
    }
    if (tick % MUSIC.idleEvery || time < this.activeUntil) return;
    const step = MUSIC.arpeggio[Math.floor(tick / MUSIC.idleEvery) % MUSIC.arpeggio.length];
    const nx = step / (SCALE.length - 1);
    const point = { ...CENTER, nx, x: (nx * 2 - 1) * MUSIC.ambientWidth, z: Math.sin(tick) * MUSIC.ambientDepth };
    this.play(step, time, MUSIC.ambientVelocity, point, false);
  }

  private play(requested: number, time: number, velocity: number, point: TouchPoint, user: boolean, note?: SequenceNote) {
    const policy = note ? this.lanePolicy(note.lane) : this.policy, checkpoint = policy.checkpoint();
    const index = policy.choose(requested), midi = this.sequence?.midi?.(index) ?? SCALE[index];
    const cancel = this.voices?.pluck(midi, time, velocity, point.depth, note?.shape);
    if (!cancel) { policy.restore(checkpoint); return; }
    this.slot = { time, user, cancel, checkpoint };
    this.emit({ time, index, midi, velocity, point, user, ...(note ? { lane: note.lane, step: note.step, envelope: voiceEnvelope(note.shape) } : {}) });
  }

  private lanePolicy(lane: string) {
    let policy = this.lanePolicies.get(lane);
    if (!policy) { policy = new NotePolicy(); this.lanePolicies.set(lane, policy); }
    return policy;
  }

  private fillUpcoming(request: Request | null) {
    const slot = this.slot;
    if (!request || !slot || slot.user || slot.time <= this.time) return;
    // A late gesture can replace an unplayed ambient note inside the lookahead window.
    slot.cancel?.(); this.policy.restore(slot.checkpoint); this.pending = null;
    this.play(pitchAt(request.point, request.tap), slot.time, request.velocity, request.point, true);
  }

  toggleMute() {
    this.muted = !this.muted; this.graph?.mute(this.muted);
    try { localStorage.setItem(MUSIC.muteKey, String(this.muted)); } catch (error) { this.report(error); }
  }

  async pause() { this.hover?.cancel(); this.release(); this.pending = null; this.audition = null; this.clock?.stop(); await this.context?.suspend(); }
  async resume() { if (this.context) { await this.context.resume(); this.clock?.start(); } }
  async close() {
    const context = this.context;
    this.release(); this.clock?.stop(); this.layers?.dispose(); this.hover?.dispose();
    this.context = null; this.graph = null; this.layers = null; this.voices = null; this.clock = null;
    this.pending = null; this.slot = null; this.activeUntil = 0; this.policy = new NotePolicy();
    this.audition = null; this.sustained = null; this.fadeEnd = null; this.lanePolicies.clear(); this.sequence?.reset();
    await context?.close();
  }
}
