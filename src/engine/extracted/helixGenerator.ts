import { random } from '../random';
export const helixGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const phis = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const helixRadius = config.radius;
    const tubeRadius = config.tubeRadius !== undefined ? config.tubeRadius : 1.5;
    const height = config.height;
    const turns = config.turns !== undefined ? config.turns : 1.5;
    const spacing = config.spacing !== undefined ? config.spacing : tubeRadius * 2;
    const segments = Math.floor(particleCount / (2 * 20));
    const tubeDensity = 20;
    const offsetX = config.offsetX || 0, offsetY = config.offsetY || 0, offsetZ = config.offsetZ || 0;
    let particleIdx = 0;
    for (let helix = 0; helix < 2 && particleIdx < particleCount; helix++) {
        const helixOffset = helix * Math.PI;
        for (let seg = 0; seg < segments && particleIdx < particleCount; seg++) {
            const t = (seg / segments) * turns * Math.PI * 2;
            const y = (seg / segments - 0.5) * height;
            const cx = helixRadius * Math.cos(t + helixOffset) + (helix - 0.5) * spacing;
            const cz = helixRadius * Math.sin(t + helixOffset);
            for (let tube = 0; tube < tubeDensity && particleIdx < particleCount; tube++) {
                const theta = (tube / tubeDensity) * Math.PI * 2;
                const u = Math.cos(theta) * tubeRadius;
                const v = Math.sin(theta) * tubeRadius;
                const angle = t + helixOffset;
                const x = cx + u * Math.cos(angle) - v * Math.sin(angle) + offsetX;
                const z = cz + u * Math.sin(angle) + v * Math.cos(angle) + offsetZ;
                positions[particleIdx * 3] = x;
                positions[particleIdx * 3 + 1] = y + (random() - 0.5) * 0.2 + offsetY;
                positions[particleIdx * 3 + 2] = z;
                phis[particleIdx] = theta + angle;
                const h = hash(particleIdx);
                sizes[particleIdx] = 0.38 + h * 0.22;
                particleIdx++;
            }
        }
    }
    fillTail(positions, phis, sizes, particleIdx, offsetX, offsetY, offsetZ);
    return { positions, phis, sizes };
};

const hash = (i: number) => {
        const x = Math.sin(i * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };
function fillTail(positions: Float32Array, phis: Float32Array, sizes: Float32Array, particleIdx: number, offsetX: number, offsetY: number, offsetZ: number) {
    while (particleIdx < positions.length / 3) {
        positions[particleIdx * 3] = offsetX;
        positions[particleIdx * 3 + 1] = offsetY;
        positions[particleIdx * 3 + 2] = offsetZ;
        phis[particleIdx] = 0;
        sizes[particleIdx] = 0.4;
        particleIdx++;
    }
}
