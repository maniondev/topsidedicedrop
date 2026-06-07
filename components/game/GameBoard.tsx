import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, RoundedRect, Circle, Group, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { Board, CellValue } from '@/lib/board';
import { ActivePiece } from '@/hooks/useGame';
import { COLS, ROWS } from '@/constants/game';
import { useTheme, useDieColors } from '@/contexts/ThemeContext';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

function Dots({ x, y, cs, value, color }: { x: number; y: number; cs: number; value: CellValue; color: string }) {
  const pad = 2;
  const rx = x + pad, ry = y + pad, rw = cs - pad * 2;
  const dotR = Math.max(cs * 0.085, 3);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={color} />
      ))}
    </>
  );
}

function StaticTile({ x, y, cs, value, faceColor, dotColor, opacity = 1 }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string; opacity?: number;
}) {
  const pad = 2;
  return (
    <Group opacity={opacity}>
      <RoundedRect x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} r={8} color={faceColor} />
      <Dots x={x} y={y} cs={cs} value={value} color={dotColor} />
    </Group>
  );
}

// A merged tile that pops (scale up + back) and flashes white. Self-contained:
// it owns its animation and runs it ONCE on mount. Because each merged tile has
// a unique id (the React key), old tiles never re-fire when a new merge happens.
function PopTile({ x, y, cs, value, faceColor, dotColor }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
}) {
  const pad = 2;
  const cx = x + cs / 2;
  const cy = y + cs / 2;
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  // run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transform = useDerivedValue(() => {
    'worklet';
    return [{ scale: 1 + 0.38 * Math.sin(Math.PI * pop.value) }];
  });
  const flashOpacity = useDerivedValue(() => {
    'worklet';
    return 0.7 * Math.sin(Math.PI * pop.value);
  });

  return (
    <Group origin={{ x: cx, y: cy }} transform={transform}>
      <RoundedRect x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} r={8} color={faceColor} />
      <Dots x={x} y={y} cs={cs} value={value} color={dotColor} />
      <RoundedRect
        x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} r={8}
        color="#ffffff" opacity={flashOpacity}
      />
    </Group>
  );
}

interface Props {
  board: Board;
  activePiece: ActivePiece | null;
  ghostAnchorRow: number | null;
  cellSize: number;
  chainPass: number;
}

export default function GameBoard({ board, activePiece, ghostAnchorRow, cellSize, chainPass }: Props) {
  const { colors } = useTheme();
  const { faceColor, dotColor } = useDieColors();
  const cs = cellSize;
  const boardW = cs * COLS;
  const boardH = cs * ROWS;

  // Latest chainPass in a ref so the board-diff effect reads the current value.
  const chainPassRef = useRef(chainPass);
  chainPassRef.current = chainPass;

  // ── Merge detection → pop tiles + glow pulse ────────────────────────────────
  const glow = useSharedValue(0);
  const seenIds = useRef<Set<string>>(new Set());
  const [popCells, setPopCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    const current = new Set<string>();
    const freshMerged: string[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        current.add(cell.id);
        if (cell.id[0] === 'm' && !seenIds.current.has(cell.id)) {
          freshMerged.push(`${r},${c}`);
        }
      }
    }
    seenIds.current = current;

    if (freshMerged.length > 0) {
      setPopCells(new Set(freshMerged));
      // Glow pulse: dim on the first merge, brighter each subsequent chain pass,
      // then fully fades — a quick flash rather than a sustained glow.
      const pass = chainPassRef.current;
      const peak = Math.min(0.22 + Math.max(0, pass - 1) * 0.26, 1);
      glow.value = 0;
      glow.value = withSequence(
        withTiming(peak, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const glowOpacity = useDerivedValue(() => {
    'worklet';
    return glow.value;
  });
  const glowStroke = useDerivedValue(() => {
    'worklet';
    return 2 + glow.value * 7;
  });

  // ── Static layers ──────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let r = 0; r <= ROWS; r++) {
      lines.push(<RoundedRect key={`hr${r}`} x={0} y={r * cs} width={boardW} height={1} r={0} color={colors.separator} />);
    }
    for (let c = 0; c <= COLS; c++) {
      lines.push(<RoundedRect key={`vc${c}`} x={c * cs} y={0} width={1} height={boardH} r={0} color={colors.separator} />);
    }
    return lines;
  }, [cs, boardW, boardH, colors.separator]);

  const boardTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        if (popCells.has(`${r},${c}`)) continue; // drawn in the animated layer
        tiles.push(
          <StaticTile key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value}
            faceColor={faceColor(cell.value)} dotColor={dotColor(cell.value)} />
        );
      }
    }
    return tiles;
  }, [board, cs, faceColor, dotColor, popCells]);

  const popTiles = useMemo(() => {
    if (popCells.size === 0) return null;
    const out: React.ReactNode[] = [];
    popCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = board[r]?.[c];
      if (!cell) return;
      // key by tile id → unique per merge, so each new merge remounts & re-animates
      out.push(
        <PopTile key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value}
          faceColor={faceColor(cell.value)} dotColor={dotColor(cell.value)} />
      );
    });
    return out;
  }, [popCells, board, cs, faceColor, dotColor]);

  const ghostTiles = useMemo(() => {
    if (!activePiece || ghostAnchorRow === null || ghostAnchorRow === activePiece.anchorRow) return null;
    return activePiece.tiles.map((t, i) => {
      const r = ghostAnchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return (
        <StaticTile key={`ghost_${i}`} x={c * cs} y={r * cs} cs={cs} value={t.value}
          faceColor={faceColor(t.value)} dotColor={dotColor(t.value)} opacity={0.18} />
      );
    });
  }, [activePiece, ghostAnchorRow, cs, faceColor, dotColor]);

  const activeTiles = useMemo(() => {
    if (!activePiece) return null;
    return activePiece.tiles.map((t, i) => {
      const r = activePiece.anchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return (
        <StaticTile key={`active_${i}`} x={c * cs} y={r * cs} cs={cs} value={t.value}
          faceColor={faceColor(t.value)} dotColor={dotColor(t.value)} />
      );
    });
  }, [activePiece, cs, faceColor, dotColor]);

  return (
    <Canvas style={{ width: boardW, height: boardH }}>
      <RoundedRect x={0} y={0} width={boardW} height={boardH} r={0} color={colors.surface} />
      {gridLines}
      {boardTiles}
      {ghostTiles}
      {activeTiles}
      {popTiles}

      {/* Chain glow — pulses on each merge, brighter per chain pass */}
      <RoundedRect
        x={2} y={2} width={boardW - 4} height={boardH - 4} r={6}
        style="stroke" strokeWidth={glowStroke} color={colors.accent} opacity={glowOpacity}
      >
        <BlurMask blur={6} style="solid" />
      </RoundedRect>
    </Canvas>
  );
}
