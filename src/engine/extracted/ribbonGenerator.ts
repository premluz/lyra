export const ribbonGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const phis = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const R = config.radius;
    const height = config.height;
    const turns = 1.2;
    const ribbonW = 16.6;
    const twistTurns = 0.9;
    const cols = Math.max(24, Math.round(Math.sqrt(particleCount / 3.2)));
    const rows = Math.max(24, Math.floor(particleCount / cols));
    let idx = 0;
    for (let r = 0; r < rows && idx < particleCount; r++) {
        const u = r / (rows - 1);
        const t = u * turns * Math.PI * 2;
        const cx = R * Math.cos(t);
        const cy = (u - 0.5) * height;
        const cz = R * Math.sin(t);
        const tw = u * twistTurns * Math.PI * 2;
        const dx = Math.cos(tw) * Math.cos(t + Math.PI / 2);
        const dy = Math.sin(tw) * 0.85;
        const dz = Math.cos(tw) * Math.sin(t + Math.PI / 2);
        for (let c = 0; c < cols && idx < particleCount; c++) {
            const v = (c / (cols - 1) - 0.5) * ribbonW;
            const j = (hash(idx * 3 + 1) - 0.5) * 0.05;
            positions[idx * 3] = cx + dx * v + j;
            positions[idx * 3 + 1] = cy + dy * v + j;
            positions[idx * 3 + 2] = cz + dz * v + j;
            phis[idx] = tw + t;
            const h = hash(idx);
            sizes[idx] = 0.38 + h * 0.22;
            idx++;
        }
    }
    fillTail(positions, phis, sizes, idx);
    return { positions, phis, sizes };
};

const hash = (i: number) => {
        const x = Math.sin(i * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };
function fillTail(positions: Float32Array, phis: Float32Array, sizes: Float32Array, idx: number) {
    while (idx < positions.length / 3) {
        positions[idx * 3] = 0;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = 0;
        phis[idx] = 0;
        sizes[idx] = 0.4;
        idx++;
    }
}
