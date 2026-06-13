import { Board, cloneBoard } from './board';
import { COLS, ROWS } from '@/constants/game';
import { resolveMerges } from './merge';
import { applyGravity } from './gravity';
import { scoreMerge, scoreClear } from './scoring';
import { CellValue } from './board';

const KEEP_ROWS = 2;

/** Phase 1: aggressively merge until stable. Returns the compressed board and score earned. */
export function runMergePhase(board: Board): { stableBoard: Board; scoreGained: number } {
  let current = cloneBoard(board);
  let scoreGained = 0;

  for (let iter = 0; iter < 120; iter++) {
    const allTriggers = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (current[r][c]) allTriggers.add(`${r},${c}`);
      }
    }

    const { newBoard, events, changed } = resolveMerges(current, allTriggers, 'c');

    if (!changed) {
      const { newBoard: gravBoard, moved } = applyGravity(current);
      if (!moved) break;
      current = gravBoard;
      continue;
    }

    for (const evt of events) {
      if (evt.newValue === 'clear') scoreGained += scoreClear(1);
      else scoreGained += scoreMerge(evt.newValue as CellValue, 1, evt.group.length);
    }

    const { newBoard: gravBoard } = applyGravity(newBoard);
    current = gravBoard;
  }

  return { stableBoard: current, scoreGained };
}

/**
 * Phase 2: clear rows from the top one by one until KEEP_ROWS remain.
 * Returns one board snapshot per row cleared (for sequential animation).
 */
export function computeClearSteps(board: Board): Array<{ board: Board; scoreGained: number }> {
  const steps: Array<{ board: Board; scoreGained: number }> = [];
  let current = cloneBoard(board);

  for (let attempt = 0; attempt < ROWS; attempt++) {
    const occupiedRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (current[r].some(c => c !== null)) occupiedRows.push(r);
    }
    if (occupiedRows.length <= KEEP_ROWS) break;

    // Clear the topmost occupied row
    const nb = cloneBoard(current);
    for (let c = 0; c < COLS; c++) nb[occupiedRows[0]][c] = null;
    const { newBoard: dropped } = applyGravity(nb);

    // One merge pass after the clear
    const allTriggers = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (dropped[r][c]) allTriggers.add(`${r},${c}`);
      }
    }
    const { newBoard: merged, events } = resolveMerges(dropped, allTriggers, 'c');
    let stepScore = 0;
    if (events.length > 0) {
      for (const evt of events) {
        if (evt.newValue === 'clear') stepScore += scoreClear(1);
        else stepScore += scoreMerge(evt.newValue as CellValue, 1, evt.group.length);
      }
      const { newBoard: gravBoard } = applyGravity(merged);
      current = gravBoard;
    } else {
      current = dropped;
    }

    steps.push({ board: cloneBoard(current), scoreGained: stepScore });
  }

  return steps;
}
