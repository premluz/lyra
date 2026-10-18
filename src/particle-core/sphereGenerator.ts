export const sphereGenerator = (particleCount: number, config: Record<string, number>) => {
    const positions = new Float32Array(particleCount * 3);
    const radius = config.radius || 3.5;
    for (let i = 0; i < particleCount; i++) {
        const y = 1 - (i / (particleCount - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = Math.sqrt(particleCount * Math.PI) * i;
        const x = Math.cos(theta) * radiusAtY * radius;
        const z = Math.sin(theta) * radiusAtY * radius;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y * radius;
        positions[i * 3 + 2] = z;
    }
    return positions;
};
