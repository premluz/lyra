import { Box3, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENGINE } from './constants';
import type { ShapeData } from './types';

function modelSurface(root: import('three').Object3D) {
  const geometries: BufferGeometry[] = [];
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!(node instanceof Mesh) || !(node.geometry instanceof BufferGeometry)) return;
    const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    geometry.applyMatrix4(node.matrixWorld);
    const surface = new BufferGeometry();
    surface.setAttribute('position', new BufferAttribute(new Float32Array(geometry.getAttribute('position').array), 3));
    geometries.push(surface);
    geometry.dispose();
  });
  if (!geometries.length) throw new Error('Model has no triangle mesh to sample.');
  const geometry = mergeGeometries(geometries);
  geometries.forEach((item) => item.dispose());
  if (!geometry) throw new Error('Model surfaces could not be combined.');
  const attribute = geometry.getAttribute('position');
  if (!(attribute instanceof BufferAttribute)) throw new Error('Model position attribute must be contiguous.');
  const box = new Box3().setFromBufferAttribute(attribute);
  const center = box.getCenter(new Vector3()), dimensions = box.getSize(new Vector3());
  const extent = Math.max(dimensions.x, dimensions.y, dimensions.z);
  if (!extent) throw new Error('Model has zero surface extent.');
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(ENGINE.sampleSize / extent, ENGINE.sampleSize / extent, ENGINE.sampleSize / extent);
  return geometry;
}

export async function loadModelShape(url: string, count: number, seed: number): Promise<ShapeData> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const geometry = modelSurface(gltf.scene);
  const material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material);
  let state = seed >>> 0;
  const sampler = new MeshSurfaceSampler(mesh).setRandomGenerator(() => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }).build();
  const point = new Vector3(), positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    sampler.sample(point);
    point.toArray(positions, index * 3);
  }
  geometry.dispose(); material.dispose();
  gltf.scene.traverse((node) => {
    if (node instanceof Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((item) => item.dispose());
    }
  });
  return { positions };
}
