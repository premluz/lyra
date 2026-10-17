export const dotsGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const size = config.size;
    const half = size / 2;
    const cols = Math.max(1, Math.round(Math.sqrt(particleCount)));
    const rows = Math.max(1, Math.ceil(particleCount / cols));
    const cellSize = size / cols;
    let idx = 0;
    for (let r = 0; r < rows && idx < particleCount; r++) {
        for (let c = 0; c < cols && idx < particleCount; c++) {
            const x = -half + (c + 0.5) * cellSize;
            const y = -half + (r + 0.5) * cellSize;
            positions[idx * 3] = x;
            positions[idx * 3 + 1] = y;
            positions[idx * 3 + 2] = 0;
            idx++;
        }
    }
    return positions;
};
