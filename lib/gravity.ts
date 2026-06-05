import { Board, cloneBoard } from './board';
import { COLS, ROWS } from '@/constants/game';

export function getSupportedSet(board: Board): Set<string> {
  const supported = new Set<string>();
  const stack: Array<[number, number]> = [];

  for (let c = 0; c < COLS; c++) {
    if (board[ROWS - 1][c]) stack.push([ROWS - 1, c]);
  }

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (supported.has(key) || !board[r][c]) continue;
    supported.add(key);
    const ns: Array<[number, number]> = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of ns) {
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] && !supported.has(`${nr},${nc}`)) {
        stack.push([nr, nc]);
      }
    }
  }

  return supported;
}

function findUnsupportedClusters(board: Board): Array<Array<[number, number]>> {
  const supported = getSupportedSet(board);
  const visited = new Set<string>();
  const clusters: Array<Array<[number, number]>> = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      if (!board[r][c] || supported.has(key) || visited.has(key)) continue;

      const cluster: Array<[number, number]> = [];
      const stack: Array<[number, number]> = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        const ck = `${cr},${cc}`;
        if (visited.has(ck) || !board[cr][cc] || supported.has(ck)) continue;
        visited.add(ck);
        cluster.push([cr, cc]);
        const ns: Array<[number, number]> = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
        for (const [nr, nc] of ns) {
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) stack.push([nr, nc]);
        }
      }
      if (cluster.length > 0) clusters.push(cluster);
    }
  }

  return clusters;
}

export function applyGravity(board: Board): { newBoard: Board; moved: boolean } {
  let current = cloneBoard(board);
  let totalMoved = false;

  for (let iter = 0; iter < ROWS * 2; iter++) {
    const clusters = findUnsupportedClusters(current);
    if (clusters.length === 0) break;

    let anyMoved = false;
    for (const cluster of clusters) {
      const sorted = [...cluster].sort((a, b) => b[0] - a[0]);
      const clusterSet = new Set(cluster.map(([r, c]) => `${r},${c}`));

      const canDrop = sorted.every(([r, c]) => {
        const below = r + 1;
        if (below >= ROWS) return false;
        return !current[below][c] || clusterSet.has(`${below},${c}`);
      });

      if (canDrop) {
        const nb = cloneBoard(current);
        for (const [r, c] of cluster) nb[r][c] = null;
        for (const [r, c] of cluster) nb[r + 1][c] = current[r][c];
        current = nb;
        anyMoved = true;
        totalMoved = true;
      }
    }

    if (!anyMoved) break;
  }

  return { newBoard: current, moved: totalMoved };
}
