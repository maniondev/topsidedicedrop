import { COLS, ROWS } from '@/constants/game';

export type CellValue = 1 | 2 | 3 | 4 | 5 | 6;
export type BoardCell = { value: CellValue; id: string } | null;
export type Board = BoardCell[][];

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function isInBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}
