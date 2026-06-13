import { Board, CellValue, cloneBoard } from './board';
import { COLS, ROWS } from '@/constants/game';

export interface MergeEvent {
  dest: [number, number];
  newValue: CellValue | 'clear';
  group: Array<[number, number]>;
}

function floodGroup(
  board: Board,
  visited: boolean[][],
  startR: number,
  startC: number,
  value: CellValue,
): Array<[number, number]> {
  const group: Array<[number, number]> = [];
  const stack: Array<[number, number]> = [[startR, startC]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (visited[r][c] || !board[r][c] || board[r][c]!.value !== value) continue;
    visited[r][c] = true;
    group.push([r, c]);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

export function findMergeGroups(board: Board): Array<Array<[number, number]>> {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups: Array<Array<[number, number]>> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] || visited[r][c]) continue;
      const group = floodGroup(board, visited, r, c, board[r][c]!.value);
      if (group.length >= 2) groups.push(group);
    }
  }
  return groups;
}

function chooseDest(
  group: Array<[number, number]>,
  triggers: Set<string>,
): [number, number] {
  // Always resolve at the lowest row in the group (gravity-consistent).
  // Among tiles in that row, prefer the trigger tile, then closest to center.
  const maxRow = Math.max(...group.map(([r]) => r));
  const bottom = group.filter(([r]) => r === maxRow);
  const triggered = bottom.find(([r, c]) => triggers.has(`${r},${c}`));
  if (triggered) return triggered;
  const center = Math.floor(COLS / 2);
  return bottom.reduce((best, cur) =>
    Math.abs(cur[1] - center) < Math.abs(best[1] - center) ? cur : best
  );
}

export function resolveMerges(
  board: Board,
  triggers: Set<string>,
  // 'm' = normal merge (board pops+animates it). Emergency Condense passes 'c'
  // so its many bulk merges don't trigger a mass of pop animations on resume.
  idPrefix: 'm' | 'c' = 'm',
): { newBoard: Board; events: MergeEvent[]; changed: boolean } {
  const groups = findMergeGroups(board);
  if (groups.length === 0) return { newBoard: board, events: [], changed: false };

  // Only resolve the lowest-value groups this pass. This ensures that when a
  // piece locks with e.g. two 1s next to two 2s, the 1s merge into a 2 first
  // so the next pass can see all three 2s together — rather than the 1→2 result
  // being orphaned because the 2s already resolved simultaneously.
  const minValue = Math.min(...groups.map(g => board[g[0][0]][g[0][1]]!.value));
  const lowestGroups = groups.filter(g => board[g[0][0]][g[0][1]]!.value === minValue);

  const nb = cloneBoard(board);
  const events: MergeEvent[] = [];
  let idBase = Date.now();

  // Clear lowest-value group cells first
  for (const group of lowestGroups) {
    for (const [r, c] of group) nb[r][c] = null;
  }

  // Place merged results
  for (const group of lowestGroups) {
    const value = board[group[0][0]][group[0][1]]!.value;
    const dest = chooseDest(group, triggers);
    const [dr, dc] = dest;
    if (value === 6) {
      events.push({ dest, newValue: 'clear', group });
      nb[dr][dc] = null;
    } else {
      const nv = (value + 1) as CellValue;
      nb[dr][dc] = { value: nv, id: `${idPrefix}${idBase++}` };
      events.push({ dest, newValue: nv, group });
    }
  }

  return { newBoard: nb, events, changed: true };
}
