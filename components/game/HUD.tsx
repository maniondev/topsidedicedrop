import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
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

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
const CS = IS_LARGE ? 26 : 18;
const NEXT_CANVAS_W = IS_LARGE ? 90 : 64;
const VALUE_AREA_H  = IS_LARGE ? 76 : 56;

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

function useCountingScore(target: number): string {
  const animVal = useRef(new Animated.Value(target)).current;
  const [display, setDisplay] = useState(() => target.toLocaleString());
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) animRef.current.stop();
    animRef.current = Animated.timing(animVal, {
      toValue: target,
      duration: 350,
      useNativeDriver: false,
    });
    animRef.current.start();
  }, [target]);

  useEffect(() => {
    const id = animVal.addListener(({ value }) => setDisplay(Math.round(value).toLocaleString()));
    return () => animVal.removeListener(id);
  }, []);

  return display;
}

function ScoreGainPopup({ text, color, active }: { text: string; color: string; active: boolean }) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(1.5)).current;
  const prevText = useRef(text);

  // Pop in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 280, friction: 8 }),
    ]).start();
  }, []);

  // Pulse on each text update
  useEffect(() => {
    if (text === prevText.current) return;
    prevText.current = text;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 55, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, tension: 320, friction: 8 }),
    ]).start();
  }, [text]);

  // Fade out when chain ends — linger briefly so the final total is readable
  useEffect(() => {
    if (!active) {
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [active]);

  const plus   = text.startsWith('+') ? '+' : '';
  const number = plus ? text.slice(1) : text;

  return (
    <Animated.View style={[styles.scoreGainRow, { opacity, transform: [{ scale }] }]}>
      <Text style={[styles.scoreGain, { color }]}>{plus}</Text>
      <Text style={[styles.scoreGain, { color }]}>{number}</Text>
      <Text style={[styles.scoreGain, { color: 'transparent' }]}>{plus}</Text>
    </Animated.View>
  );
}

interface Props {
  score: number;
  bestScore: number;
  nextPiece?: QueuedPiece;
  onLogoPress?: () => void;
  isLarge?: boolean;
  scoreGain?: string | null;
  scoreGainKey?: number;
  scoreGainActive?: boolean;
}

function valueFontSize(n: number): number {
  const len = Math.round(n).toLocaleString().length;
  if (IS_LARGE) {
    if (len <= 5) return 38;
    if (len === 6) return 32;
    if (len === 7) return 27;
    return 23;
  }
  if (len <= 5) return 28;
  if (len === 6) return 24;
  if (len === 7) return 21;
  return 18;
}

function HUD({ score, bestScore, nextPiece, onLogoPress, isLarge, scoreGain, scoreGainKey, scoreGainActive = false }: Props) {
  const { colors } = useTheme();
  const { faceColor, dotColor } = useDieColors();
  const { diceStyle } = useDiceStyle();
  const logoSize = isLarge ? 76 : 58;
  const displayScore = useCountingScore(score);

  return (
    <View style={styles.row}>

      <TouchableOpacity
        style={styles.logoBtn}
        onPress={onLogoPress}
        disabled={!onLogoPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.6}
      >
        <AppLogo size={logoSize} />
      </TouchableOpacity>

      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SCORE</Text>
          <View style={styles.valueArea}>
            <View>
              <Text style={[styles.value, { color: colors.titleColor ?? colors.text, fontFamily: 'Rubik_700Bold', fontSize: valueFontSize(score) }]}>
                {displayScore}
              </Text>
              {scoreGain ? (
                <View style={styles.scoreGainWrap} pointerEvents="none">
                  <ScoreGainPopup key={scoreGainKey} text={scoreGain} color={colors.titleColor ?? colors.text} active={scoreGainActive} />
                </View>
              ) : null}
            </View>
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
  label:     { fontSize: IS_LARGE ? 14 : 11, fontWeight: '700', letterSpacing: 1.5 },
  valueArea: { height: VALUE_AREA_H, alignItems: 'center', justifyContent: 'center' },
  value:     { fontSize: 28 },
  divider:   { width: 1, height: VALUE_AREA_H, marginTop: IS_LARGE ? 20 : 16 },
  scoreGainWrap: { position: 'absolute', top: '100%', left: -60, right: -60, alignItems: 'center', paddingTop: 2 },
  scoreGainRow:  { flexDirection: 'row' },
  scoreGain:     { fontFamily: 'Fredoka_400Regular', fontSize: IS_LARGE ? 22 : 18 },
});
