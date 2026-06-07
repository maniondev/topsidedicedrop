import { Board, cloneBoard } from './board';
import { COLS, ROWS } from '@/constants/game';
import { resolveMerges } from './merge';
import { applyGravity } from './gravity';
import { scoreMerge, scoreClear } from './scoring';
import { CellValue } from './board';

export function runEmergencyCondense(board: Board): { finalBoard: Board; scoreGained: number } {
  let current = cloneBoard(board);
  let scoreGained = 0;

  // Aggressively merge until completely stable
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
      else scoreGained += scoreMerge(evt.newValue as CellValue, 1);
    }

    const { newBoard: gravBoard } = applyGravity(newBoard);
    current = gravBoard;
  }

  // Clear rows from the top until only 1 row remains occupied
  let attempts = 0;
  while (attempts++ < ROWS) {
    const occupiedRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (current[r].some(c => c !== null)) occupiedRows.push(r);
    }
    if (occupiedRows.length <= 1) break;

    // Remove the topmost occupied row
    const nb = cloneBoard(current);
    for (let c = 0; c < COLS; c++) nb[occupiedRows[0]][c] = null;
    const { newBoard } = applyGravity(nb);
    current = newBoard;

    // One more merge pass after each row removal
    const allTriggers = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (current[r][c]) allTriggers.add(`${r},${c}`);
      }
    }
    const { newBoard: merged, events } = resolveMerges(current, allTriggers, 'c');
    if (events.length > 0) {
      for (const evt of events) {
        if (evt.newValue === 'clear') scoreGained += scoreClear(1);
        else scoreGained += scoreMerge(evt.newValue as CellValue, 1);
      }
      const { newBoard: gravBoard } = applyGravity(merged);
      current = gravBoard;
    }
  }

  return { finalBoard: current, scoreGained };
}
