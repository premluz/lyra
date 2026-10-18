import { AdditiveBlending, NormalBlending, DataTexture, RedFormat, LinearFilter } from 'three';
import { styleUniforms } from '../particle-core/uniforms';
import { shaderPrelude } from '../visual/shaders';
import type { OrbVisualisation } from '../visual/visualisation';
import type { AudioFrame } from '../audio/meter';
import type { NoteEvent } from '../score';
import type { TouchPoint } from '../score';
import { INTERACTION as L } from '../interaction/config';
import { OrbLife } from './orb-life';
import lifeShader from './orb-life.glsl?raw';
import { COMPOSE } from './config';
import type { Score } from './model';
import type { ScorePlayback } from './playback';
import { MusicField } from './music-field';
import { MUSIC_VISUAL as V, MUSIC_SHADER } from './visual-config';
import type { MusicTreatment } from './visual-config';
import vertex from './music-vertex.glsl?raw';
import fragment from './music-fragment.glsl?raw';
import { SURFACE } from '../visual/surface';
import type { MusicShape } from '../visual/surface';

const constants = Object.entries(MUSIC_SHADER).map(([name, value]) => `#define MUSIC_${name} ${value.toFixed(8)}`).join('\n') + `
  #define LIFE_IDLE_SPEED ${L.idleSpeed}
  #define LIFE_IDLE_DEPTH ${L.idleDepth}
  #define LIFE_WAVE_NOISE_FREQUENCY ${L.waveNoiseFrequency}
  #define LIFE_WAVE_NOISE_SPEED ${L.waveNoiseSpeed}
  #define LIFE_WAVE_NOISE_DEPTH ${L.waveNoiseDepth}
  #define LIFE_WIDTH ${L.width}
  #define LIFE_LOCAL_FREQUENCY ${L.localFrequency}
  #define LIFE_LOCAL_SPEED ${L.localSpeed}
  #define LIFE_HEAT ${L.heat}
  #define LIFE_WHITE_POWER ${L.whitePower.toFixed(1)}
  #define MUSIC_LANES ${COMPOSE.maxLanes}
  #define MUSIC_TAU ${Math.PI * 2}
  #define MUSIC_BAND ${V.bandWidth}
  #define MUSIC_PROFILE_DEPTH ${V.profileDepth}
  #define MUSIC_PULSE_DEPTH ${V.pulseDepth}
  #define MUSIC_RIDGE_MIN ${V.ridgeMin.toFixed(1)}
  #define MUSIC_RIDGE_RANGE ${V.ridgeRange.toFixed(1)}
  #define MUSIC_RING_SPEED ${V.ringSpeed.toFixed(1)}
  #define MUSIC_MAX_MORPH ${V.maxMorph}
  #define MUSIC_NOISE_DEPTH ${V.noiseDepth}
  #define MUSIC_BASS_DEPTH ${V.bassDepth}
  #define MUSIC_TWIST_DEPTH ${V.twistDepth}
  #define MUSIC_REST_LIGHT ${V.restLight}
  #define MUSIC_ACTIVE_LIGHT ${V.activeLight}
  #define MUSIC_BRIGHTNESS ${V.brightness}
`;
export class MusicVisual implements OrbVisualisation {
  readonly vertexShader = `${shaderPrelude}\n${constants}\n${lifeShader}\n${vertex}`;
  readonly fragmentShader = `${constants}\n${fragment}`;
  readonly field: MusicField;
  readonly life = new OrbLife();
  private texture: DataTexture;
  readonly uniforms;
  private treatment: MusicTreatment = 'glow';
  private selectedShape: MusicShape = 'orb';
  constructor(private score: Score, private playback: ScorePlayback) {
    this.field = new MusicField(score);
    this.texture = new DataTexture(this.field.profiles, V.samples, COMPOSE.maxLanes, RedFormat);
    this.texture.magFilter = LinearFilter; this.texture.minFilter = LinearFilter;
    this.uniforms = { ...styleUniforms(), ...this.life.uniforms, uMusicProfiles: { value: this.texture }, uMusicLanes: { value: this.field.lanes },
      uMusicPulses: { value: this.field.pulses }, uMusicSpectrum: { value: this.field.spectrum }, uMusicPlayhead: { value: 0 },
      uMusicPositions: { value: new Float32Array(COMPOSE.maxLanes) }, uMusicWaves: { value: 0 }, uMusicWaveSize: { value: SURFACE.size } };
    this.uniforms.uPulseColor.value.set(V.low); this.uniforms.uPulseColorEdge.value.set(V.mid);
    this.uniforms.uPulseHot.value.set(V.high); this.uniforms.uPulseAfterglow.value.set(V.afterglow);
  }
  get blending() { return this.treatment === 'halftone' ? NormalBlending : AdditiveBlending; }
  get shape() { return this.selectedShape; }
  setTreatment(treatment: MusicTreatment) { this.treatment = treatment; this.uniforms.uHalftoneProgress.value = treatment === 'halftone' ? 1 : 0; }
  setShape(shape: MusicShape) { this.selectedShape = shape; this.uniforms.uMusicWaves.value = shape === 'waves' ? 1 : 0; this.life.leave(); }
  invalidate() { this.field.invalidate(); }
  move(point: TouchPoint, speed: number) { this.life.move(point, speed); }
  hold(held: boolean) { this.life.hold(held); }
  leave() { this.life.leave(); }
  note(event: NoteEvent) { this.field.note(event); this.life.note(event); }
  update(time: number, delta: number, audio: AudioFrame) {
    if (this.field.rebuild()) this.texture.needsUpdate = true;
    this.field.update(time, delta, audio);
    this.life.update(time, delta);
    this.uniforms.uMusicPlayhead.value = Math.max(0, this.playback.position(time)) / COMPOSE.steps;
    this.score.state.lanes.forEach((lane, index) => { this.uniforms.uMusicPositions.value[index] = Math.max(0, this.playback.position(time, lane.id)) / lane.notes.length; });
  }
  reset() { this.field.reset(); this.life.reset(); }
  dispose() { this.texture.dispose(); }
}
