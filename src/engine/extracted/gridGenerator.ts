export const gridGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const size = config.size;
    const half = size / 2;
    const cols = Math.max(1, Math.round(Math.sqrt(particleCount)));
    const rows = Math.max(1, Math.ceil(particleCount / cols));
    const cellSize = size / cols;
    const rowWidthMultiplier = (t: number) => 1 + t * 0.6;
    let idx = 0;
    for (let r = 0; r < rows && idx < particleCount; r++) {
        const z = -half + (r + 0.5) * cellSize;
        const t = half > 0 ? z / half : 0;
        const widthScale = rowWidthMultiplier(t);
        for (let c = 0; c < cols && idx < particleCount; c++) {
            const x = (-half + (c + 0.5) * cellSize) * widthScale;
            positions[idx * 3] = x;
            positions[idx * 3 + 1] = 0;
            positions[idx * 3 + 2] = z;
            idx++;
        }
    }
    return positions;
};
