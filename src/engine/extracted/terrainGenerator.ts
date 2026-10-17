import { random } from '../random';
export const terrainGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const width = config.width;
    const depth = config.depth;
    const halfW = width / 2;
    const halfD = depth / 2;
    const cols = Math.max(1, Math.round(Math.sqrt(particleCount * (width / depth))));
    const rows = Math.max(1, Math.ceil(particleCount / cols));
    const cellW = width / cols;
    const cellD = depth / rows;
    let idx = 0;
    for (let r = 0; r < rows && idx < particleCount; r++) {
        for (let c = 0; c < cols && idx < particleCount; c++) {
            const jitterX = (random() - 0.5) * cellW * 0.8;
            const jitterZ = (random() - 0.5) * cellD * 0.8;
            let x = -halfW + (c + 0.5) * cellW + jitterX;
            let z = -halfD + (r + 0.5) * cellD + jitterZ;
            const nx = x / halfW;
            const nz = z / halfD;
            const dist = Math.sqrt(nx * nx + nz * nz);
            if (dist > 0.0001) {
                const angle = Math.atan2(nz, nx);
                const threshold = edgeFactor(angle);
                if (dist > threshold) {
                    const pull = threshold / dist;
                    x *= pull;
                    z *= pull;
                }
            }
            positions[idx * 3] = x;
            positions[idx * 3 + 1] = 0;
            positions[idx * 3 + 2] = z;
            idx++;
        }
    }
    return positions;
};

const edgeFactor = (angle: number) => 1.0
        + 0.22 * Math.sin(angle * 2.3 + 0.6)
        + 0.15 * Math.sin(angle * 3.7 + 2.4)
        + 0.11 * Math.sin(angle * 5.1 + 4.1)
        + 0.07 * Math.sin(angle * 7.9 + 1.2);
