export const heroHelixGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const turns = config.turns;
    const tiltRad = (config.tiltDeg * Math.PI) / 180;
    const zoom = config.zoom || 1;
    const len = config.axisLength * zoom;
    const r0 = config.radius * zoom;
    const taper = config.radiusTaper;
    const tubeR = config.tubeRadius * zoom;
    const perRing = config.tubeDensity;
    const offX = (config.offsetX || 0) * zoom;
    const offY = (config.offsetY || 0) * zoom;
    const offZ = config.offsetZ || 0;
    const tiltX = ((config.tiltXDeg || 0) * Math.PI) / 180;
    const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
    const ax = 0, ay = Math.cos(tiltRad), az = -Math.sin(tiltRad);
    const ux = 1, uy = 0, uz = 0;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;

    const rings = Math.max(2, Math.floor(particleCount / perRing));
    let idx = 0;
    for (let ri = 0; ri < rings && idx < particleCount; ri++) {
        const s = ri / (rings - 1);
        const angle = s * turns * Math.PI * 2;
        const radius = r0 * (1 - (1 - taper) * s);
        const cx = ax * len * s + offX;
        const cy = ay * len * s + offY;
        const cz = az * len * s + offZ;
        for (let t = 0; t < perRing && idx < particleCount; t++) {
            const theta = (t / perRing) * Math.PI * 2;
            writePoint(positions, sizes, idx, theta, { cx, cy, cz, radius, angle, ux, uy, uz, vx, vy, vz, tubeR, cosX, sinX });
            idx++;
        }
    }
    return { positions, sizes };
};

const hash01 = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
function writePoint(positions: Float32Array, sizes: Float32Array, idx: number, theta: number, values: Record<string, number>) {
    const { cx, cy, cz, radius, angle, ux, uy, uz, vx, vy, vz, tubeR, cosX, sinX } = values;
            const px = cx + radius * (Math.cos(angle) * ux + Math.sin(angle) * vx);
            const py = cy + radius * (Math.cos(angle) * uy + Math.sin(angle) * vy);
            const pz = cz + radius * (Math.cos(angle) * uz + Math.sin(angle) * vz);
            const jitter = 0.6 + hash01(idx) * 0.8;
            const fx = px + Math.cos(theta) * tubeR * jitter;
            const fy = py + Math.sin(theta) * tubeR * jitter * 0.7;
            const fz = pz + Math.sin(theta) * tubeR * jitter;
            positions[idx * 3] = fx;
            positions[idx * 3 + 1] = fy * cosX - fz * sinX;
            positions[idx * 3 + 2] = fy * sinX + fz * cosX;
            sizes[idx] = 0.38 + hash01(idx + 31) * 0.22;
}
