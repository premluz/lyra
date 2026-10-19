import { VIEW, clamp } from './config';
import { SoundEngine } from './audio/engine';
import { OrbMesh } from './visual/mesh';
import { Gestures } from './gestures';
import { ui, report, soundState } from './ui';
import type { NoteEvent } from './score';
import type { OrbVisualisation } from './visual/visualisation';

type SoundFactory = (emit: (event: NoteEvent) => void, report: (error: unknown) => void) => SoundEngine;

export class Session {
  private sound: SoundEngine;
  private mesh: OrbMesh | null = null;
  private gestures: Gestures;
  private frame = 0;
  private last = 0;
  private idleTime = 0;
  private visible = true;
  private exited = false;
  private transition = Promise.resolve();
  private observer: IntersectionObserver;

  constructor(factory: SoundFactory = (emit, report) => new SoundEngine(emit, report), private onFrame?: (time: number) => void, visibilityTarget?: Element, private visual?: OrbVisualisation) {
    this.sound = factory((event) => {
      this.mesh?.ripple(event); ui.mesh.dispatchEvent(new CustomEvent('orb:note', { detail: event }));
    }, report);
    this.createMesh();
    this.gestures = this.createGestures();
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.updateActivity(); });
    this.observer.observe(visibilityTarget ?? ui.mesh);
    document.addEventListener('visibilitychange', () => this.updateActivity());
    ui.sound.addEventListener('click', () => { void this.toggleSound().catch(report); });
    ui.exit?.addEventListener('click', () => { void this.exit().catch(report); });
    ui.back.addEventListener('click', () => this.back());
    window.addEventListener('pagehide', () => { this.stopFrame(); void this.sound.close().catch(report); });
    window.addEventListener('pageshow', (event) => { if (event.persisted) this.updateActivity(); });
    this.showSound(); this.startFrame();
  }

  private createGestures() {
    return new Gestures(ui.mesh, {
      point: (x, y) => this.point(x, y), start: () => { void this.start().catch(report); },
      note: (point, velocity, tap) => this.sound.request(point, velocity, tap),
      move: (point, speed) => { this.mesh?.move(point, speed); this.sound.hoverAt(point); },
      press: (point) => { if (this.visual) { this.mesh?.hold(true); this.sound.press(point); } },
      drag: (point, velocity, amount) => { this.mesh?.hold(true); this.sound.drag(point, velocity, amount); },
      release: () => { this.mesh?.hold(false); this.sound.release(); },
      leave: () => { this.mesh?.leave(); this.sound.leave(); },
    });
  }

  private createMesh() {
    const canvas = document.createElement('canvas'), context = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!context) {
      ui.mesh.dataset.fallback = 'true'; ui.status.textContent = 'WebGL is unavailable. The still orb is here; the music still responds.';
      return;
    }
    this.mesh = new OrbMesh(ui.mesh, context, this.visual); ui.mesh.dataset.ready = 'true';
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); this.stopFrame(); this.mesh?.dispose(); this.mesh = null;
      ui.mesh.dataset.fallback = 'true'; report(new Error('Graphics context lost. Reload to restore the moving orb.'));
    });
  }

  private point(x: number, y: number) {
    if (this.mesh) return this.mesh.point(x, y);
    const rect = ui.mesh.getBoundingClientRect(), nx = clamp((x - rect.left) / rect.width), depth = clamp((y - rect.top) / rect.height);
    return { nx, depth, x: (nx * 2 - 1) * VIEW.interactionRadius, z: (1 - depth * 2) * VIEW.interactionRadius,
      ...(this.visual ? { y: 0, proximity: clamp(1 - (nx * 2 - 1) ** 2 - (depth * 2 - 1) ** 2) } : {}) };
  }

  async start() {
    if (this.exited || document.hidden || !this.visible) return;
    await this.sound.unlock();
    if (this.exited || document.hidden || !this.visible) await this.sound.pause();
    this.showSound();
  }
  async fadeOut(seconds: number) { await this.start(); this.sound.fadeOut(seconds); }

  private async toggleSound() {
    if (!this.sound.started) await this.start();
    else this.sound.toggleMute();
    this.showSound();
  }

  private showSound() { soundState(this.sound.started, this.sound.muted, this.sound.state); }
  private updateActivity() {
    this.transition = this.transition.then(async () => {
      const active = this.visible && !document.hidden && !this.exited;
      if (active) { await this.sound.resume(); this.startFrame(); }
      else { this.gestures.leave(); this.stopFrame(); await this.sound.pause(); }
      this.showSound();
    }).catch(report);
  }

  private startFrame() { if (!this.frame && !this.exited) { this.last = performance.now(); this.frame = requestAnimationFrame((time) => this.render(time)); } }
  private stopFrame() { cancelAnimationFrame(this.frame); this.frame = 0; }
  private render(now: number) {
    if (this.sound.fadeComplete) { void this.exit().catch(report); return; }
    const delta = Math.min((now - this.last) / 1000, VIEW.frameDeltaCap); this.last = now; this.idleTime += delta;
    this.visual?.update(this.sound.time, delta, this.sound.analysis);
    this.mesh?.render(this.sound.started ? this.sound.time : this.idleTime, delta, this.sound.level);
    this.onFrame?.(this.sound.time);
    this.frame = requestAnimationFrame((time) => this.render(time));
  }

  private async exit() {
    if (this.exited) return;
    this.exited = true; this.gestures.leave(); this.stopFrame(); await this.sound.close();
    this.mesh?.reset(); this.idleTime = 0;
    ui.overlay.hidden = false; ui.mesh.inert = true; ui.sound.disabled = true;
    ui.root.dataset.exited = 'true'; this.showSound(); ui.back.focus();
  }

  private back() {
    this.exited = false; ui.overlay.hidden = true; ui.mesh.inert = false; ui.sound.disabled = false;
    ui.root.dataset.exited = 'false'; this.updateActivity(); ui.mesh.focus();
  }
}
