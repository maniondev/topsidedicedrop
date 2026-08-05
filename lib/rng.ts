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

export type RampMode = 'score' | 'moves';

// Weights indexed 0–5 for values 1–6, keyed by score (shipped behavior).
function getWeightsByScore(score: number): number[] {
  if (score < 800)   return [55, 35, 10,  0,  0, 0];
  if (score < 1500)  return [48, 35, 15,  2,  0, 0];
  if (score < 2500)  return [44, 34, 17,  5,  0, 0];
  if (score < 5000)  return [36, 33, 24,  7,  0, 0];
  if (score < 7500)  return [27, 32, 27,  9,  5, 0];
  if (score < 10000) return [20, 30, 28, 13,  7, 2];
  return                    [15, 30, 25, 15, 10, 5];
}

// Ramp keyed on pieces generated instead of score, so a scoring streak (big
// merges, all-clears) no longer drags difficulty forward on its own — skill
// shows up as score-per-move rather than as a faster clock.
//
// Not a 1:1 restatement of the score table: 8 brackets to the score table's 7
// (its top bracket is split at 800/1000). Playtested to a ~800-move run; the
// expected spawned die value rises ~0.19 per bracket after the early game, so
// the curve has no cliffs. 5s unlock at 400, 6s at 600.
function getWeightsByMoves(moves: number): number[] {
  if (moves < 60)   return [55, 35, 10,  0, 0, 0];
  if (moves < 125)  return [48, 35, 15,  2, 0, 0];
  if (moves < 200)  return [44, 34, 17,  5, 0, 0];
  if (moves < 400)  return [36, 33, 24,  7, 0, 0];
  if (moves < 600)  return [29, 32, 26,  9, 4, 0];
  if (moves < 800)  return [24, 30, 29, 11, 5, 1];
  if (moves < 1000) return [20, 29, 28, 14, 7, 2];
  return                   [17, 29, 25, 16, 9, 4];
}

export function weightedValue(rampKey: number, mode: RampMode, rng: RNG): CellValue {
  const weights = mode === 'moves' ? getWeightsByMoves(rampKey) : getWeightsByScore(rampKey);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return (i + 1) as CellValue;
  }
  return 1;
}
