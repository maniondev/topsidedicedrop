import { Difficulty } from '@/contexts/DifficultyContext';
import { SavedGame } from './storage';

// Dev-only: preset boards for capturing the App Store preview video.
//
// Both variants are single-drop, full-board clears, verified in offline
// simulation against the app's real resolveMerges/applyGravity (with true
// top-down drop physics — no tunneling under overhangs).
//
// Variant 1 — "twin towers": mirrored 1-6 ladders at the left/right edges.
//   The queued [1,6,1] triple spawns already spanning the center three
//   columns — hard-drop it as-is. Both towers collapse in lockstep and the
//   full bottom row 6-clears. 12 cells, 6 chain passes.
//
// Variant 2 — "organic": a scattered board filling only the bottom half
//   (found by simulated annealing biased against tidy ladders), so the
//   falling dice stay visible. The queued vertical [4,3,4] triple spawns at
//   the center column — move it ONE column RIGHT and drop. 12 cells, 7 chain
//   passes with exactly two pair-of-6 clears (including a six-5s merge on
//   the way) down to an empty board.
//
// Rows are top (r0) to bottom (r7); 0 = empty.
const LAYOUTS: Record<1 | 2, number[][]> = {
  1: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [6, 0, 0, 0, 6],
    [5, 0, 0, 0, 5],
    [4, 0, 0, 0, 4],
    [3, 0, 0, 0, 3],
    [2, 0, 0, 0, 2],
    [1, 0, 0, 0, 1],
  ],
  2: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [5, 4, 3, 4, 5],
    [0, 0, 0, 6, 0],
    [5, 4, 5, 3, 6],
    [0, 0, 0, 5, 0],
  ],
};

// The money piece for each variant, followed by neutral fillers (randoms
// refill behind these as pieces are consumed).
const QUEUES: Record<1 | 2, unknown[]> = {
  1: [
    { shapeId: 'P5', rotation: 0, tiles: [{ dr: 0, dc: 0, value: 1 }, { dr: 0, dc: 1, value: 6 }, { dr: 0, dc: 2, value: 1 }] },
    { shapeId: 'P2', rotation: 0, tiles: [{ dr: 0, dc: 0, value: 2 }, { dr: 0, dc: 1, value: 3 }] },
    { shapeId: 'P1', rotation: 0, tiles: [{ dr: 0, dc: 0, value: 4 }] },
  ],
  2: [
    { shapeId: 'P5', rotation: 1, tiles: [{ dr: 0, dc: 0, value: 4 }, { dr: 1, dc: 0, value: 3 }, { dr: 2, dc: 0, value: 4 }] },
    { shapeId: 'P2', rotation: 0, tiles: [{ dr: 0, dc: 0, value: 2 }, { dr: 0, dc: 1, value: 3 }] },
    { shapeId: 'P1', rotation: 0, tiles: [{ dr: 0, dc: 0, value: 4 }] },
  ],
};

// Non-zero starting scores so the video reads as mid-run, not turn one.
const SCORES: Record<1 | 2, number> = { 1: 1732, 2: 2894 };

export function buildDemoSave(difficulty: Difficulty, variant: 1 | 2): SavedGame {
  let id = 1;
  const board = LAYOUTS[variant].map(row =>
    row.map(v => (v ? { value: v, id: `demo${id++}` } : null)),
  );
  return {
    board,
    score: SCORES[variant],
    queue: QUEUES[variant],
    activePiece: null,
    runBestChain: 0,
    difficulty,
    savedAt: Date.now(),
    demo: true,
  };
}
