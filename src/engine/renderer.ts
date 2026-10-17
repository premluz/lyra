import { BufferAttribute, BufferGeometry, PerspectiveCamera, Points, Scene, WebGLRenderer } from 'three';
import { ShapeCache } from './shapes';
import { ENGINE } from './constants';
import { createMaterial } from './material';
import { sampleDirector } from './director';
import { applyScene, applyStyles, setNumber } from './apply';
import { PointerField } from './pointer';
import { RenderTreatment } from './render-treatment';
import type { Project } from './types';

export class ParticleRenderer {
  readonly renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(ENGINE.fov, 1, ENGINE.near, ENGINE.far);
  private shader = createMaterial();
  private geometry = new BufferGeometry();
  private points = new Points(this.geometry, this.shader.material);
  private treatment = new RenderTreatment(this.points, this.shader.uniforms);
  private observer: ResizeObserver;
  private cache: ShapeCache;
  private pointer: PointerField;
  private pair = '';
  private generation = 0;
  private disposed = false;
  private prepared: Project | null = null;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private container: HTMLElement, project: Project, private modelBase: string) {
    this.cache = new ShapeCache(project.particleCount, project.seed, modelBase);
    this.renderer.setClearColor(0, 0);
    this.renderer.domElement.className = 'particle-canvas';
    container.append(this.renderer.domElement);
    this.scene.add(this.points);
    this.scene.add(this.treatment.ink);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.pointer = new PointerField(container, this.points, this.camera, this.shader.uniforms);
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      throw new Error(`Particle shader failed: ${gl.getProgramInfoLog(program)} ${gl.getShaderInfoLog(vertex)} ${gl.getShaderInfoLog(fragment)}`);
    };
    this.resize();
  }

  async prepare(project: Project) {
    const generation = ++this.generation;
    if (this.prepared?.particleCount !== project.particleCount || this.prepared?.seed !== project.seed) {
      this.cache = new ShapeCache(project.particleCount, project.seed, this.modelBase);
    }
    await this.cache.prepare(project.keyframes.map((frame) => frame.state.shape));
    if (generation !== this.generation || this.disposed) return false;
    this.prepared = project;
    this.pair = '';
    return true;
  }

  private upload(from: string, to: string, project: Project) {
    const signature = `${from}:${to}:${project.particleCount}:${project.seed}`;
    if (signature === this.pair) return;
    const fromFrame = project.keyframes.find((frame) => frame.id === from), toFrame = project.keyframes.find((frame) => frame.id === to);
    if (!fromFrame || !toFrame) throw new Error('Director references a missing keyframe.');
    const a = this.cache.get(fromFrame.state.shape), b = this.cache.get(toFrame.state.shape);
    const attributes = { position: [a.positions, 3], aTargetPos: [b.positions, 3], size: [a.sizes, 1],
      aTargetSize: [b.sizes, 1], helixPhi: [a.phis, 1], aTargetHelixPhi: [b.phis, 1],
      aRibbonProgress: [a.ribbonProgress, 1], aTargetRibbonProgress: [b.ribbonProgress, 1] };
    for (const [name, attribute] of Object.entries(attributes)) {
      const [array, size] = attribute;
      if (!(array instanceof Float32Array) || typeof size !== 'number') throw new Error(`Invalid geometry attribute: ${name}`);
      this.geometry.setAttribute(name, new BufferAttribute(array, size));
    }
    const roles = new Float32Array(project.particleCount);
    for (let i = 0; i < roles.length; i++) roles[i] = ((i * 127.1) % 1000) / 1000;
    this.geometry.setAttribute('aRoleHash', new BufferAttribute(roles, 1));
    this.points.frustumCulled = false;
    this.pair = signature;
  }

  render(project: Project, progress: number, seconds: number, light = false) {
    if (this.disposed || this.prepared !== project) return;
    const sample = sampleDirector(project, progress);
    this.upload(sample.from.id, sample.to.id, project);
    const u = this.shader.uniforms;
    setNumber(u, 'uMorphProgress', sample.mix);
    setNumber(u, 'uTime', this.reduced.matches ? ENGINE.frozenTime : seconds);
    u.uPrefersReducedMotion.value = this.reduced.matches;
    applyStyles(u, sample);
    applyScene(this.points, this.camera, u, sample);
    this.pointer.update();
    this.treatment.update(light);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio, ENGINE.pixelRatioCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    setNumber(this.shader.uniforms, 'uDprNorm', dpr / 2);
    setNumber(this.shader.uniforms, 'uPointerAspect', width / height);
  }

  capture() { return this.renderer.domElement.toDataURL('image/png'); }
  dispose() {
    this.disposed = true; this.generation++;
    this.observer.disconnect(); this.pointer.dispose();
    this.geometry.dispose(); this.treatment.dispose(); this.shader.material.dispose(); this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
