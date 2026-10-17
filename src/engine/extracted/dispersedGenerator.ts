import { random } from '../random';
export const dispersedGenerator = (particleCount: number) => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (random() - 0.5) * 50;
        positions[i * 3 + 1] = (random() - 0.5) * 50;
        positions[i * 3 + 2] = (random() - 0.5) * 50;
    }
    return positions;
};
