export type CellValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface TileOffset {
  dr: number;
  dc: number;
}

export interface PieceShape {
  id: string;
  rotations: TileOffset[][];
}

// Each rotation is a list of [dr, dc] offsets from anchor (top-left of bounding box).
// Values are generated at spawn time, not stored here.
export const PIECES: PieceShape[] = [
  {
    id: 'P1',
    rotations: [
      [{ dr: 0, dc: 0 }],
    ],
  },
  {
    id: 'P2',
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }],
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }],
    ],
  },
  {
    id: 'P3',
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }],
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }],
    ],
  },
  {
    id: 'P4',
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 0 }],
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 1, dc: 1 }],
      [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }],
    ],
  },
  {
    id: 'P5',
    rotations: [
      [{ dr: 0, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: 2 }],
      [{ dr: 0, dc: 0 }, { dr: 1, dc: 0 }, { dr: 2, dc: 0 }],
    ],
  },
];

export const PIECE_MAP = Object.fromEntries(PIECES.map(p => [p.id, p]));
