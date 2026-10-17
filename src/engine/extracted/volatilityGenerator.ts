export const volatilityGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const cols = config.cols;
    const rows = Math.max(2, Math.ceil(particleCount / cols));
    const nearDist = config.nearDist, farDist = config.farDist;
    const ratio = farDist / nearDist;
    const camZ = 8, planeY = config.planeY, nearWidth = config.nearWidth;
    const hash01 = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
    let idx = 0;
    for (let r = 0; r < rows && idx < particleCount; r++) {
        const rowN = rows > 1 ? r / (rows - 1) : 0;
        const dist = nearDist * Math.pow(ratio, rowN);
        const widen = Math.pow(dist / nearDist, 0.7);
        for (let c = 0; c < cols && idx < particleCount; c++) {
            const colN = c / (cols - 1);
            positions[idx * 3] = (colN - 0.5) * nearWidth * widen;
            positions[idx * 3 + 1] = planeY;
            positions[idx * 3 + 2] = camZ - dist;
            const h = hash01(idx);
            sizes[idx] = 0.38 + h * 0.22;
            idx++;
        }
    }
    return { positions, sizes };
};
