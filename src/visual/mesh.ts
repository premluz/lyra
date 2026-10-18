import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, PerspectiveCamera, Plane, Points, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderer } from 'three';
import { shapeDefinitions } from '../particle-core/definitions';
import { styleUniforms } from '../particle-core/uniforms';
import { VIEW, clamp } from '../config';
import type { NoteEvent, TouchPoint } from '../score';
import { fragmentShader, vertexShader } from './shaders';
import type { OrbVisualisation } from './visualisation';
import { spherePoint } from './sphere-point';
import { wavePositions, wavePoint } from './surface';

export class OrbMesh {
  readonly renderer: WebGLRenderer;
  private camera = new PerspectiveCamera(VIEW.fov, 1, VIEW.near, VIEW.far);
  private scene = new Scene();
  private ray = new Raycaster();
  private plane = new Plane(new Vector3(0, 1, 0), 0);
  private ripples = Array.from({ length: VIEW.maxRipples }, () => new Vector4(0, 0, -100, 0));
  private rippleLanes = Array.from({ length: VIEW.maxRipples }, () => '');
  private uniforms = {
    ...styleUniforms(), uTime: { value: 0 }, uMint: { value: new Color(VIEW.mint) }, uWarm: { value: new Color(VIEW.warm) },
    uRipples: { value: this.ripples }, uSwell: { value: new Vector3() }, uWake: { value: new Vector3() },
    uEnergy: { value: 0 }, uMotion: { value: 1 }, uPointSize: { value: VIEW.dotSize }, uPixelRatio: { value: 1 },
  };
  private geometry = new BufferGeometry();
  private material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms: this.uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending });
  private orbSpeed = this.uniforms.uOrbSpeed.value;
  private observer: ResizeObserver;
  private rippleIndex = 0;
  private pointer: TouchPoint = { x: 0, z: 0, nx: 0.5, depth: 0.5 };
  private swell = 0;
  private wake = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private frameScale = 1;

  constructor(private host: HTMLElement, context: WebGL2RenderingContext, private visual?: OrbVisualisation) {
    if (visual) {
      this.material.vertexShader = visual.vertexShader; this.material.fragmentShader = visual.fragmentShader;
      Object.assign(this.material.uniforms, visual.uniforms);
    }
    this.renderer = new WebGLRenderer({ canvas: context.canvas, context, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0, 0);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      throw new Error(`Noise Orb shader: ${gl.getProgramInfoLog(program)}\nVertex: ${gl.getShaderInfoLog(vertex)}\nFragment: ${gl.getShaderInfoLog(fragment)}`);
    };
    const definition = shapeDefinitions.find((shape) => shape.key === 'lab');
    if (!definition) throw new Error('Noise Orb shape definition is missing.');
    const count = innerWidth < VIEW.mobileWidth ? VIEW.mobileCount : VIEW.desktopCount;
    const data = definition.generate(count, definition.config);
    const positions = data instanceof Float32Array ? data : data.positions;
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    if (visual) this.geometry.setAttribute('aWavePosition', new BufferAttribute(wavePositions(count), 3));
    this.scene.add(new Points(this.geometry, this.material));
    this.host.append(this.renderer.domElement); this.camera.lookAt(0, 0, 0);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
  }

  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio, VIEW.dprCap);
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(width, height, false);
    this.uniforms.uPixelRatio.value = dpr;
    this.camera.position.set(VIEW.camera[0], VIEW.camera[1], width < VIEW.mobileWidth ? VIEW.mobileCameraZ : VIEW.camera[2]);
    this.camera.lookAt(0, 0, 0); this.camera.aspect = width / height;
    this.frameScale = Number(this.host.dataset.frameScale ?? 1);
    if (!Number.isFinite(this.frameScale) || this.frameScale <= 0 || this.frameScale > 1) throw new Error('Orb framing scale must be between zero and one.');
    this.camera.zoom = this.frameScale === 1 ? 1 : this.frameScale * Math.min(width, height) / height
      * this.camera.position.length() / Math.hypot(...VIEW.camera);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }

  point(clientX: number, clientY: number): TouchPoint {
    const rect = this.host.getBoundingClientRect();
    this.ray.setFromCamera(new Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), this.camera);
    if (this.visual) return this.visual.shape === 'waves' ? wavePoint(this.ray.ray) : spherePoint(this.ray.ray, VIEW.interactionRadius);
    const hit = this.ray.ray.intersectPlane(this.plane, new Vector3());
    const radius = VIEW.interactionRadius, x = clamp(hit?.x ?? 0, -radius, radius), z = clamp(hit?.z ?? 0, -radius, radius);
    return { x, z, nx: (x + radius) / (radius * 2), depth: 1 - (z + radius) / (radius * 2) };
  }

  move(point: TouchPoint, speed: number) { this.visual?.move?.(point, speed); this.pointer = point; this.wake = Math.max(this.wake, speed * VIEW.wakeGain); }
  hold(held: boolean) { this.visual?.hold?.(held); this.swell = held ? VIEW.swellHeight : 0; }
  leave() { this.visual?.leave?.(); }
  ripple(event: NoteEvent) {
    if (this.visual) { this.visual.note(event); return; }
    const lane = event.lane ?? 'live';
    const existing = this.ripples.findIndex((ripple, i) => ripple.z === event.time && this.rippleLanes[i] === lane);
    const index = existing < 0 ? this.rippleIndex : existing, ripple = this.ripples[index];
    this.rippleLanes[index] = lane;
    ripple.set(event.point.x, event.point.z, event.time, VIEW.rippleGain * event.velocity);
    if (existing < 0) this.rippleIndex = (this.rippleIndex + 1) % VIEW.maxRipples;
  }

  reset() { this.visual?.reset(); for (const ripple of this.ripples) ripple.z = -100; this.swell = 0; this.wake = 0; }

  render(time: number, delta: number, level: number) {
    if (this.frameScale !== Number(this.host.dataset.frameScale ?? 1)) this.resize();
    const u = this.uniforms, reduced = this.reduced.matches;
    if (this.visual) this.material.blending = this.visual.blending;
    u.uTime.value = time; u.uEnergy.value = level; u.uMotion.value = reduced ? VIEW.reducedScale : 1;
    u.uOrbSpeed.value = reduced ? this.orbSpeed * VIEW.reducedSpeed : this.orbSpeed;
    const factor = 1 - Math.exp(-delta / (this.swell ? VIEW.swellEase : VIEW.releaseSeconds));
    u.uSwell.value.z += (this.swell - u.uSwell.value.z) * factor;
    u.uSwell.value.x += (this.pointer.x - u.uSwell.value.x) * factor;
    u.uSwell.value.y += (this.pointer.z - u.uSwell.value.y) * factor;
    this.wake *= Math.exp(-delta / VIEW.wakeDecay);
    u.uWake.value.set(this.pointer.x, this.pointer.z, this.wake);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() { this.visual?.dispose(); this.observer.disconnect(); this.geometry.dispose(); this.material.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
