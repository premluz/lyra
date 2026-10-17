export const torusGenerator = (particleCount: number) => {
    const positions = new Float32Array(particleCount * 3);
    const majorRadius = 4;
    const minorRadius = 1.5;
    const segments = Math.floor(Math.sqrt(particleCount));
    let particleIdx = 0;
    for (let i = 0; i < segments && particleIdx < particleCount; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        for (let j = 0; j < segments && particleIdx < particleCount; j++) {
            const phi = (j / segments) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);
            const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
            const y = minorRadius * sinPhi;
            const z = (majorRadius + minorRadius * cosPhi) * sinTheta;
            positions[particleIdx * 3] = x;
            positions[particleIdx * 3 + 1] = y;
            positions[particleIdx * 3 + 2] = z;
            particleIdx++;
        }
    }
    while (particleIdx < particleCount) {
        positions[particleIdx * 3] = 0;
        positions[particleIdx * 3 + 1] = 0;
        positions[particleIdx * 3 + 2] = 0;
        particleIdx++;
    }
    return positions;
};
