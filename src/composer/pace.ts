import { COMPOSE } from './config';

export const RATES = [
  { value: 0.5, numerator: 1, denominator: 2, label: '½×' },
  { value: 1, numerator: 1, denominator: 1, label: '1×' },
  { value: 1.5, numerator: 3, denominator: 2, label: '1½×' },
  { value: 2, numerator: 2, denominator: 1, label: '2×' },
] as const;
export type LaneRate = typeof RATES[number]['value'];
export const NORMAL_RATE: LaneRate = 1;
export function isRate(value: unknown): value is LaneRate { return RATES.some((rate) => rate.value === value); }

export function laneTicks(tick: number, rate: LaneRate, steps = COMPOSE.steps) {
  const ratio = RATES.find((item) => item.value === rate);
  if (!ratio) throw new Error(`Unknown lane rate ${rate}.`);
  const numerator = ratio.numerator * steps, denominator = ratio.denominator * COMPOSE.steps;
  const first = Math.ceil(tick * numerator / denominator);
  const end = Math.ceil((tick + 1) * numerator / denominator);
  return Array.from({ length: end - first }, (_, index) => {
    const local = first + index;
    return { step: local % steps, offset: local * denominator / numerator - tick };
  });
}
