import { CHAIN_MULTIPLIERS, SIX_CLEAR_BASE } from '@/constants/game';
import { CellValue } from './board';

function multiplier(pass: number): number {
  return CHAIN_MULTIPLIERS[Math.min(pass, CHAIN_MULTIPLIERS.length - 1)];
}

export function scoreMerge(newValue: CellValue, chainPass: number): number {
  return Math.round((newValue - 1) * 2 * multiplier(chainPass));
}

export function scoreClear(chainPass: number): number {
  return Math.round(SIX_CLEAR_BASE * multiplier(chainPass));
}
