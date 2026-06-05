import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Canvas, RoundedRect, Circle, Group, Paint,
} from '@shopify/react-native-skia';
import { Board, CellValue } from '@/lib/board';
import { ActivePiece } from '@/hooks/useGame';
import { COLS, ROWS, VALUE_COLORS, VALUE_DOT_COLORS } from '@/constants/game';
import { useTheme } from '@/contexts/ThemeContext';

// Die dot positions as [xFrac, yFrac] within tile interior
const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

interface TileDrawProps {
  x: number;
  y: number;
  cs: number;
  value: CellValue;
  opacity?: number;
}

function TileDraw({ x, y, cs, value, opacity = 1 }: TileDrawProps) {
  const pad = 2;
  const rx = x + pad;
  const ry = y + pad;
  const rw = cs - pad * 2;
  const radius = 8;
  const fill = VALUE_COLORS[value] ?? '#888';
  const dotColor = VALUE_DOT_COLORS[value] ?? '#fff';
  const dotR = Math.max(cs * 0.085, 3);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];

  return (
    <Group opacity={opacity}>
      <RoundedRect x={rx} y={ry} width={rw} height={rw} r={radius} color={fill} />
      {dots.map(([xf, yf], i) => (
        <Circle
          key={i}
          cx={rx + xf * rw}
          cy={ry + yf * rw}
          r={dotR}
          color={dotColor}
        />
      ))}
    </Group>
  );
}

interface Props {
  board: Board;
  activePiece: ActivePiece | null;
  ghostAnchorRow: number | null;
}

export default function GameBoard({ board, activePiece, ghostAnchorRow }: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  const cs = Math.floor((width - 32) / COLS);
  const boardW = cs * COLS;
  const boardH = cs * ROWS;

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let r = 0; r <= ROWS; r++) {
      lines.push(
        <RoundedRect key={`hr${r}`} x={0} y={r * cs} width={boardW} height={1} r={0} color={colors.separator} />
      );
    }
    for (let c = 0; c <= COLS; c++) {
      lines.push(
        <RoundedRect key={`vc${c}`} x={c * cs} y={0} width={1} height={boardH} r={0} color={colors.separator} />
      );
    }
    return lines;
  }, [cs, boardW, boardH, colors.separator]);

  // Board tiles
  const boardTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell) {
          tiles.push(
            <TileDraw key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value} />
          );
        }
      }
    }
    return tiles;
  }, [board, cs]);

  // Ghost piece (landing preview)
  const ghostTiles = useMemo(() => {
    if (!activePiece || ghostAnchorRow === null || ghostAnchorRow === activePiece.anchorRow) return null;
    return activePiece.tiles.map((t, i) => {
      const r = ghostAnchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return (
        <TileDraw
          key={`ghost_${i}`}
          x={c * cs}
          y={r * cs}
          cs={cs}
          value={t.value}
          opacity={0.20}
        />
      );
    });
  }, [activePiece, ghostAnchorRow, cs]);

  // Active falling piece
  const activeTiles = useMemo(() => {
    if (!activePiece) return null;
    return activePiece.tiles.map((t, i) => {
      const r = activePiece.anchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return (
        <TileDraw key={`active_${i}`} x={c * cs} y={r * cs} cs={cs} value={t.value} />
      );
    });
  }, [activePiece, cs]);

  return (
    <Canvas style={{ width: boardW, height: boardH }}>
      {/* Background */}
      <RoundedRect x={0} y={0} width={boardW} height={boardH} r={0} color={colors.surface} />
      {gridLines}
      {boardTiles}
      {ghostTiles}
      {activeTiles}
    </Canvas>
  );
}
