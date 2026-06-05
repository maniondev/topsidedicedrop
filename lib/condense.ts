import { Board, cloneBoard } from './board';
import { COLS, ROWS } from '@/constants/game';
import { resolveMerges } from './merge';
import { applyGravity } from './gravity';
import { scoreMerge, scoreClear } from './scoring';

export function runEmergencyCondense(board: Board): { finalBoard: Board; scoreGained: number } {
  let current = cloneBoard(board);
  let scoreGained = 0;

  for (let iter = 0; iter < 60; iter++) {
    const allTriggers = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (current[r][c]) allTriggers.add(`${r},${c}`);
      }
    }

    const { newBoard, events, changed } = resolveMerges(current, allTriggers);

    if (!changed) {
      const { newBoard: gravBoard, moved } = applyGravity(current);
      if (!moved) break;
      current = gravBoard;
      continue;
    }

    for (const evt of events) {
      if (evt.newValue === 'clear') scoreGained += scoreClear(1);
      else scoreGained += scoreMerge(evt.newValue, 1);
    }

    const { newBoard: gravBoard } = applyGravity(newBoard);
    current = gravBoard;
  }

  // If still more than 2 occupied rows, remove the highest occupied row
  const occupiedRows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (current[r].some(c => c !== null)) occupiedRows.push(r);
  }

  if (occupiedRows.length > 2) {
    const nb = cloneBoard(current);
    for (let c = 0; c < COLS; c++) nb[occupiedRows[0]][c] = null;
    const { newBoard } = applyGravity(nb);
    current = newBoard;
  }

  return { finalBoard: current, scoreGained };
}
