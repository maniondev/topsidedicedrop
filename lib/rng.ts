import { CellValue } from './board';

export class RNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// Weights indexed 0–5 for values 1–6
function getWeights(score: number): number[] {
  if (score < 800)   return [55, 35, 10,  0,  0, 0];
  if (score < 1500)  return [48, 35, 15,  2,  0, 0];
  if (score < 2500)  return [44, 34, 17,  5,  0, 0];
  if (score < 5000)  return [36, 33, 24,  7,  0, 0];
  if (score < 7500)  return [27, 32, 27,  9,  5, 0];
  if (score < 10000) return [20, 30, 28, 13,  7, 2];
  return                    [15, 30, 25, 15, 10, 5];
}

export function weightedValue(score: number, rng: RNG): CellValue {
  const weights = getWeights(score);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return (i + 1) as CellValue;
  }
  return 1;
}
