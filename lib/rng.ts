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
  if (score < 1000)  return [55, 35, 10,  0,  0, 0];
  if (score < 5000)  return [35, 35, 20,  7,  3, 0];
  if (score < 15000) return [20, 30, 25, 15, 10, 0];
  return                    [10, 25, 30, 20, 10, 5];
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
