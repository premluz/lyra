export const tripleSphereGenerator = (particleCount: number) => {
    const positions = new Float32Array(particleCount * 3);
    const sphereRadius = 2.5;
    const spacing = 7;
    const particlesPerSphere = Math.floor(particleCount / 3);
    let particleIdx = 0;
    const sphereCenters = [
        [-spacing, 0, 0],
        [spacing, 0, 0],
        [0, spacing * 0.866, 0]
    ];
    for (let s = 0; s < 3 && particleIdx < particleCount; s++) {
        const [cx, cy, cz] = sphereCenters[s];
        const particlesInThisSphere = (s === 2) ? (particleCount - particleIdx) : particlesPerSphere;
        for (let i = 0; i < particlesInThisSphere && particleIdx < particleCount; i++) {
            const y = 1 - (i / (particlesInThisSphere - 1)) * 2;
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = Math.sqrt(particleCount * Math.PI) * (i % particlesInThisSphere);
            const x = Math.cos(theta) * radiusAtY * sphereRadius;
            const z = Math.sin(theta) * radiusAtY * sphereRadius;
            positions[particleIdx * 3] = x + cx;
            positions[particleIdx * 3 + 1] = y * sphereRadius + cy;
            positions[particleIdx * 3 + 2] = z + cz;
            particleIdx++;
        }
    }
    return positions;
};
