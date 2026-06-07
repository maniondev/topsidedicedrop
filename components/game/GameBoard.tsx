import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, RoundedRect, Circle, Group, BlurMask } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming, Easing } from 'react-native-reanimated';
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

// A merged tile that pops (scale up + back) and flashes white. All driven by the
// shared `pop` value on the UI thread — no JS-thread work per frame.
function PopTile({ x, y, cs, value, faceColor, dotColor, pop }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
  pop: ReturnType<typeof useSharedValue<number>>;
}) {
  const pad = 2;
  const cx = x + cs / 2;
  const cy = y + cs / 2;

  const transform = useDerivedValue(() => {
    'worklet';
    const p = pop.value;
    const scale = 1 + 0.38 * Math.sin(Math.PI * p); // up then back to 1
    return [{ scale }];
  });
  const flashOpacity = useDerivedValue(() => {
    'worklet';
    return 0.7 * Math.sin(Math.PI * pop.value);
  });

  return (
    <Group origin={{ x: cx, y: cy }} transform={transform}>
      <RoundedRect x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} r={8} color={faceColor} />
      <Dots x={x} y={y} cs={cs} value={value} color={dotColor} />
      {/* white flash on top */}
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

  // ── Merge pop ──────────────────────────────────────────────────────────────
  const pop = useSharedValue(0);
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
        // 'm'-prefixed ids are freshly-merged tiles (see lib/merge.ts)
        if (cell.id[0] === 'm' && !seenIds.current.has(cell.id)) {
          freshMerged.push(`${r},${c}`);
        }
      }
    }
    seenIds.current = current;
    if (freshMerged.length > 0) {
      setPopCells(new Set(freshMerged));
      pop.value = 0;
      pop.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // ── Chain glow ─────────────────────────────────────────────────────────────
  const glow = useSharedValue(0);
  useEffect(() => {
    // Pass 1 = first merge (no chain). Pass 2+ = chain reactions → glow brighter.
    const intensity = chainPass >= 2 ? Math.min((chainPass - 1) / 3, 1) : 0;
    glow.value = withTiming(intensity, { duration: 160 });
  }, [chainPass, glow]);

  const glowOpacity = useDerivedValue(() => {
    'worklet';
    return glow.value * 0.9;
  });
  const glowStroke = useDerivedValue(() => {
    'worklet';
    return 2 + glow.value * 6;
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
      out.push(
        <PopTile key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value}
          faceColor={faceColor(cell.value)} dotColor={dotColor(cell.value)} pop={pop} />
      );
    });
    return out;
  }, [popCells, board, cs, faceColor, dotColor, pop]);

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

      {/* Chain glow — soft inner border that brightens with each chain pass */}
      <RoundedRect
        x={2} y={2} width={boardW - 4} height={boardH - 4} r={6}
        style="stroke" strokeWidth={glowStroke} color={colors.accent} opacity={glowOpacity}
      >
        <BlurMask blur={6} style="solid" />
      </RoundedRect>
    </Canvas>
  );
}
