import 'three/addons/math/MeshSurfaceSampler.js';

// @types/three 0.186.0 omits this method present in three 0.186.1's implementation.
declare module 'three/addons/math/MeshSurfaceSampler.js' {
  interface MeshSurfaceSampler {
    setRandomGenerator(randomFunction: () => number): this;
  }
}
