export type CellValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface TileOffset {
  dr: number;
  dc: number;
}

export interface PieceShape {
  id: string;
  rotations: TileOffset[][];
}

// All pieces have exactly 4 rotation states (90° CW each tap).
// Symmetric pieces repeat states so 4 taps always cycles back to start.
export const PIECES: PieceShape[] = [
  {
    id: 'P1',
    rotations: [
      [{ dr: 0, dc: 0 }],
      [{ dr: 0, dc: 0 }],
      [{ dr: 0, dc: 0 }],
      [{ dr: 0, dc: 0 }],
    ],
  },
  {
    id: 'P2', // domino (horizontal start) — 4 taps = full cycle, 2 unique shapes
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }], // 0°   H
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }], // 90°  V
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }], // 180° H
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }], // 270° V
    ],
  },
  {
    id: 'P3', // domino (vertical start) — 4 taps = full cycle
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }], // 0°   V
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }], // 90°  H
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }], // 180° V
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }], // 270° H
    ],
  },
  {
    id: 'P4', // L-triomino — 4 unique states
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 0 }],
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }],
      [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
    ],
  },
  {
    id: 'P5', // 3-in-a-row — 4 taps = full cycle, 2 unique shapes
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }], // 0°   H
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }], // 90°  V
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }], // 180° H
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }], // 270° V
    ],
  },
];

export const PIECE_MAP = Object.fromEntries(PIECES.map(p => [p.id, p]));
