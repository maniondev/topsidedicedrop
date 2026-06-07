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
  // Prefer trigger tile in group
  for (const [r, c] of group) {
    if (triggers.has(`${r},${c}`)) return [r, c];
  }
  // Fallback: lowest row then rightmost col (Emergency Condense)
  return group.reduce((best, cur) =>
    cur[0] > best[0] || (cur[0] === best[0] && cur[1] > best[1]) ? cur : best,
  );
}

export function resolveMerges(
  board: Board,
  triggers: Set<string>,
): { newBoard: Board; events: MergeEvent[]; changed: boolean } {
  const groups = findMergeGroups(board);
  if (groups.length === 0) return { newBoard: board, events: [], changed: false };

  const nb = cloneBoard(board);
  const events: MergeEvent[] = [];
  let idBase = Date.now();

  // Clear all group cells first (simultaneous resolution)
  for (const group of groups) {
    for (const [r, c] of group) nb[r][c] = null;
  }

  // Place merged results
  for (const group of groups) {
    const value = board[group[0][0]][group[0][1]]!.value;
    const dest = chooseDest(group, triggers);
    const [dr, dc] = dest;
    if (value === 6) {
      events.push({ dest, newValue: 'clear', group });
      nb[dr][dc] = null;
    } else {
      const nv = (value + 1) as CellValue;
      // 'm' prefix marks a freshly-merged tile so the board can pop+flash it.
      nb[dr][dc] = { value: nv, id: `m${idBase++}` };
      events.push({ dest, newValue: nv, group });
    }
  }

  return { newBoard: nb, events, changed: true };
}
