import { random } from '../random';
import { ribbonGenerator } from './ribbonGenerator';
export const ribbonDispersedGenerator = (particleCount: number, config: Record<string, number>) => {
    const dispersedFraction = config.dispersedFraction != null ? config.dispersedFraction : 0.1;
    const dispersedCount = Math.round(particleCount * dispersedFraction);
    const latticeCount = particleCount - dispersedCount;
    const positions = new Float32Array(particleCount * 3);
    const phis = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const ribbonProgress = new Float32Array(particleCount).fill(-1);
    const cols = Math.max(24, Math.round(Math.sqrt(latticeCount / 3.2)));
    const rows = Math.max(24, Math.floor(latticeCount / cols));
    const lattice = ribbonGenerator(latticeCount, config);
    positions.set(lattice.positions); phis.set(lattice.phis); sizes.set(lattice.sizes);
    let idx = 0;
    for (let r = 0; r < rows && idx < latticeCount; r++) {
        const u = r / (rows - 1);
        for (let c = 0; c < cols && idx < latticeCount; c++) {
            ribbonProgress[idx] = u;
            idx++;
        }
    }
    while (idx < latticeCount) {
        idx++;
    }
    const scatterHalfWidth = 25;
    for (; idx < particleCount; idx++) {
        positions[idx * 3] = (random() - 0.5) * scatterHalfWidth * 2;
        positions[idx * 3 + 1] = (random() - 0.5) * scatterHalfWidth * 2;
        positions[idx * 3 + 2] = (random() - 0.5) * scatterHalfWidth * 2;
        phis[idx] = 0;
        sizes[idx] = 0.3 + random() * 0.3;
    }
    return { positions, phis, sizes, ribbonProgress };
};
