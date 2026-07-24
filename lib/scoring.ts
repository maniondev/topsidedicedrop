import { CHAIN_MULTIPLIERS, SIX_CLEAR_BASE } from '@/constants/game';
import { CellValue } from './board';

function multiplier(pass: number): number {
  return CHAIN_MULTIPLIERS[Math.min(pass, CHAIN_MULTIPLIERS.length - 1)];
}

export function scoreMerge(newValue: CellValue, chainPass: number, diceCount: number = 2): number {
  return Math.round((newValue - 1) * diceCount * multiplier(chainPass));
}

// A six-clear is worth SIX_CLEAR_BASE for the clear itself (the first two 6s)
// plus SIX_CLEAR_BASE for each additional 6 in the group — i.e. 20 / 40 / 60 /
// 80 for 2 / 3 / 4 / 5 sixes — all scaled by the chain multiplier.
export function scoreClear(chainPass: number, sixCount: number = 2): number {
  return Math.round(SIX_CLEAR_BASE * (sixCount - 1) * multiplier(chainPass));
}
