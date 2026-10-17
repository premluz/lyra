import { sphereGenerator } from './sphereGenerator';
import { helixGenerator } from './helixGenerator';
import { ribbonGenerator } from './ribbonGenerator';
import { ribbonDispersedGenerator } from './ribbonDispersedGenerator';
import { terrainGenerator } from './terrainGenerator';
import { gridGenerator } from './gridGenerator';
import { dotsGenerator } from './dotsGenerator';
import { tripleSphereGenerator } from './tripleSphereGenerator';
import { torusGenerator } from './torusGenerator';
import { dispersedGenerator } from './dispersedGenerator';
import { heroHelixGenerator } from './heroHelixGenerator';
import { collapseGenerator } from './collapseGenerator';
import { volatilityGenerator } from './volatilityGenerator';
import type { ShapeData } from '../types';
interface Definition { key: string; generate: (count: number, config: Record<string, number>) => ShapeData | Float32Array; config: Record<string, number> }
export const shapeDefinitions: Definition[] = [
 { key: 'sphere', generate: sphereGenerator, config: {"radius":3.5,"height":12,"scale":1} },
 { key: 'lab', generate: sphereGenerator, config: {"radius":3,"height":12,"scale":1} },
 { key: 'helix', generate: helixGenerator, config: {"radius":3.2,"height":20,"scale":1,"turns":2.2,"tubeRadius":1.6,"spacing":0.5,"offsetX":0,"offsetY":0,"offsetZ":0} },
 { key: 'ribbon', generate: ribbonGenerator, config: {"radius":3.5,"height":12,"scale":1} },
 { key: 'ribbon-dispersed', generate: ribbonDispersedGenerator, config: {"radius":2.5,"height":22,"scale":1,"dispersedFraction":0.2} },
 { key: 'ribbon-dispersed-pulse', generate: ribbonDispersedGenerator, config: {"radius":2.5,"height":22,"scale":1,"dispersedFraction":0.2} },
 { key: 'terrain', generate: terrainGenerator, config: {"radius":2.2,"height":12,"scale":1,"width":13,"depth":11} },
 { key: 'grid', generate: gridGenerator, config: {"radius":2.2,"height":12,"scale":1,"size":30} },
 { key: 'dots', generate: dotsGenerator, config: {"radius":2.2,"height":12,"scale":1,"size":30} },
 { key: 'triple-sphere', generate: tripleSphereGenerator, config: {"radius":10,"height":12,"scale":1} },
 { key: 'torus', generate: torusGenerator, config: {"radius":6,"height":12,"scale":1} },
 { key: 'dispersed', generate: dispersedGenerator, config: {"radius":25,"height":12,"scale":1} },
 { key: 'hero-helix', generate: heroHelixGenerator, config: {"radius":3.1,"height":12,"scale":1,"turns":3.5,"tiltDeg":22,"axisLength":13,"radiusTaper":0.55,"tubeRadius":0.42,"tubeDensity":26,"zoom":1.6,"tiltXDeg":-15,"offsetX":-3.4,"offsetY":-4.2,"offsetZ":1.5} },
 { key: 'collapse', generate: collapseGenerator, config: {"radius":1.6,"height":12,"scale":1} },
 { key: 'volatility', generate: volatilityGenerator, config: {"radius":2.2,"height":12,"scale":1,"cols":140,"nearDist":4,"farDist":48,"planeY":-2.6,"nearWidth":12,"reliefScale":0.4} },
];
