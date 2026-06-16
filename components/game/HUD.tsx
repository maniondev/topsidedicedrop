import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Canvas, RoundedRect, Circle, Rect, Group, BlurMask, Line, RadialGradient, vec, rrect, rect } from '@shopify/react-native-skia';
import { useTheme, useDieColors } from '@/contexts/ThemeContext';
import { useDiceStyle, DiceStyleId } from '@/contexts/DiceStyleContext';
import { QueuedPiece } from '@/hooks/useGame';
import AppLogo from '@/components/AppLogo';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

const CS = 18;
const NEXT_CANVAS_W = 64;
const VALUE_AREA_H  = 56;

function PreviewDie({ x, y, cs, value, faceColor, dotColor, diceStyle }: {
  x: number; y: number; cs: number; value: number;
  faceColor: string; dotColor: string; diceStyle: DiceStyleId;
}) {
  const pad = 1;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const cx = rx + rw / 2, cy = ry + rw / 2;
  const dotR = Math.max(cs * 0.09, 2);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];

  switch (diceStyle) {
    case 'sketch':
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={4} color={faceColor} style="stroke" strokeWidth={1.5} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={Math.max(cs * 0.095, 2.2)} color={faceColor} style="stroke" strokeWidth={1.2} />
          ))}
        </>
      );

    case 'round':
      return (
        <>
          <Circle cx={cx} cy={cy} r={rw / 2} color={faceColor} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR * 0.92} color={dotColor} />
          ))}
        </>
      );

    case 'pixel': {
      const pipSize = Math.max(cs * 0.16, 3);
      return (
        <>
          <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
          <Rect x={rx} y={ry} width={rw} height={1.5} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry} width={1.5} height={rw} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry + rw - 1.5} width={rw} height={1.5} color="rgba(0,0,0,0.3)" />
          <Rect x={rx + rw - 1.5} y={ry} width={1.5} height={rw} color="rgba(0,0,0,0.3)" />
          {dots.map(([xf, yf], i) => (
            <Rect key={i} x={rx + xf * rw - pipSize / 2} y={ry + yf * rw - pipSize / 2} width={pipSize} height={pipSize} color={dotColor} />
          ))}
        </>
      );
    }

    case 'neon':
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={4} color="rgba(6,3,16,0.93)" />
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={4} color={faceColor} style="stroke" strokeWidth={1.5}>
            <BlurMask blur={2.5} style="solid" />
          </RoundedRect>
          <RoundedRect x={rx + 1} y={ry + 1} width={rw - 2} height={rw - 2} r={3} color={faceColor} style="stroke" strokeWidth={0.5} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={faceColor}>
              <BlurMask blur={1.8} style="solid" />
            </Circle>
          ))}
          {dots.map(([xf, yf], i) => (
            <Circle key={`s${i}`} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR * 0.55} color={faceColor} />
          ))}
        </>
      );

    case 'raised': {
      const bevel = Math.max(cs * 0.12, 2.5);
      const clip = rrect(rect(rx, ry, rw, rw), 4, 4);
      return (
        <>
          <Group clip={clip}>
            <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
            <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
              <RadialGradient c={vec(rx, ry)} r={rw * 1.5} colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']} />
            </Rect>
            <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
              <RadialGradient c={vec(rx + rw, ry + rw)} r={rw * 1.5} colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']} />
            </Rect>
            <Rect x={rx} y={ry} width={rw} height={bevel} color="rgba(255,255,255,0.48)" />
            <Rect x={rx} y={ry + bevel} width={bevel} height={rw - bevel} color="rgba(255,255,255,0.28)" />
            <Rect x={rx} y={ry + rw - bevel} width={rw} height={bevel} color="rgba(0,0,0,0.45)" />
            <Rect x={rx + rw - bevel} y={ry} width={bevel} height={rw - bevel} color="rgba(0,0,0,0.28)" />
          </Group>
          {dots.map(([xf, yf], i) => (
            <Circle key={`sh${i}`} cx={rx + xf * rw + 1} cy={ry + yf * rw + 1} r={dotR} color="rgba(0,0,0,0.35)" />
          ))}
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
          ))}
        </>
      );
    }

    default: // classic
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={4} color={faceColor} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
          ))}
        </>
      );
  }
}

const InlinePiece = React.memo(function InlinePiece({ piece, faceColor, dotColor, diceStyle }: {
  piece: QueuedPiece;
  faceColor: (v: number) => string;
  dotColor: (v: number) => string;
  diceStyle: DiceStyleId;
}) {
  const maxDr = useMemo(() => Math.max(...piece.tiles.map(t => t.dr)), [piece]);
  const maxDc = useMemo(() => Math.max(...piece.tiles.map(t => t.dc)), [piece]);
  const w = (maxDc + 1) * CS + 2;
  const h = (maxDr + 1) * CS + 2;
  return (
    <Canvas style={{ width: w, height: h }}>
      {piece.tiles.map((t, i) => {
        const x = t.dc * CS + 1;
        const y = t.dr * CS + 1;
        return (
          <PreviewDie
            key={i}
            x={x} y={y} cs={CS}
            value={t.value}
            faceColor={faceColor(t.value)}
            dotColor={dotColor(t.value)}
            diceStyle={diceStyle}
          />
        );
      })}
    </Canvas>
  );
}, (prev, next) => prev.piece === next.piece && prev.diceStyle === next.diceStyle);

interface Props {
  score: number;
  bestScore: number;
  nextPiece?: QueuedPiece;
  onLogoPress?: () => void;
}

function valueFontSize(n: number): number {
  const len = Math.round(n).toLocaleString().length;
  if (len <= 5) return 28;
  if (len === 6) return 24;
  if (len === 7) return 21;
  return 18;
}

function HUD({ score, bestScore, nextPiece, onLogoPress }: Props) {
  const { colors } = useTheme();
  const { faceColor, dotColor } = useDieColors();
  const { diceStyle } = useDiceStyle();

  return (
    <View style={styles.row}>

      <TouchableOpacity
        style={styles.logoBtn}
        onPress={onLogoPress}
        disabled={!onLogoPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.6}
      >
        <AppLogo size={58} />
      </TouchableOpacity>

      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SCORE</Text>
          <View style={styles.valueArea}>
            <Text style={[styles.value, { color: colors.text, fontFamily: 'Rubik_700Bold', fontSize: valueFontSize(score) }]}>
              {score.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>BEST</Text>
          <View style={styles.valueArea}>
            <Text style={[styles.value, { color: colors.accent, fontFamily: 'Rubik_700Bold', fontSize: valueFontSize(bestScore) }]}>
              {bestScore.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>NEXT</Text>
          <View style={[styles.valueArea, { width: NEXT_CANVAS_W }]}>
            {nextPiece && (
              <InlinePiece piece={nextPiece} faceColor={faceColor} dotColor={dotColor} diceStyle={diceStyle} />
            )}
          </View>
        </View>
      </View>

    </View>
  );
}

export default React.memo(HUD);

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  logoBtn:   { marginLeft: 14, marginRight: -4 },
  columns:   { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' },
  col:       { flex: 1, alignItems: 'center' },
  label:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  valueArea: { height: VALUE_AREA_H, alignItems: 'center', justifyContent: 'center' },
  value:     { fontSize: 28 },
  divider:   { width: 1, height: VALUE_AREA_H, marginTop: 16 },
});
