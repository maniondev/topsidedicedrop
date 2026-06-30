import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, RoundedRect, Circle, Group, BlurMask, Rect, Line, RadialGradient, vec, rrect, rect, Path, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue,
  withTiming, withSequence, withDelay, withSpring,
  Easing,
} from 'react-native-reanimated';
import { Board, CellValue } from '@/lib/board';
import { ActivePiece } from '@/hooks/useGame';
import { MergeEvent } from '@/lib/merge';
import { COLS, ROWS, chainResolveDelay } from '@/constants/game';
import { useTheme, useDieColors } from '@/contexts/ThemeContext';
import { useAnimation, AnimPackId } from '@/contexts/AnimationContext';
import { useDiceStyle, DiceStyleId } from '@/contexts/DiceStyleContext';

// ─── Per-pack animation config ────────────────────────────────────────────────
interface AnimConfig {
  // Pop / squash-stretch
  popScale: number;
  popDuration: number;
  popEasing: any;
  squash: boolean;        // extra: separate scaleX/scaleY with spring
  twist: boolean;         // twist: 360° rotation on merge
  flip: boolean;          // flip: scaleY 1→0→1 card flip
  glitch: boolean;        // glitch: translateX jitter + flash
  showFlash: boolean;
  flashPeak: number;

  // Border glow on merge
  showGlow: boolean;
  glowPeakMult: number;
  glowStrokeMult: number;

  // 6-clear burst
  burstVariant: 'classic' | 'multi' | 'electric' | 'square' | 'shatter' | 'none';
  burstDuration: number;

  // Per-merge particle effect
  mergeParticles: 'none' | 'pixels' | 'sparks' | 'shatter';

  // Wiggle on tile land (lock)
  landWiggle: boolean;
}

const ANIM_CONFIGS: Record<AnimPackId, AnimConfig> = {
  classic: {
    popScale: 0.38, popDuration: 240, popEasing: Easing.out(Easing.cubic), squash: false, twist: false, flip: false, glitch: false,
    showFlash: false, flashPeak: 0,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'classic', burstDuration: 520,
    mergeParticles: 'none', landWiggle: false,
  },
  extra: {
    popScale: 0, popDuration: 0, popEasing: Easing.linear, squash: true, twist: false, flip: false, glitch: false,
    showFlash: false, flashPeak: 0,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'multi', burstDuration: 680,
    mergeParticles: 'none', landWiggle: true,
  },
  minimal: {
    popScale: 0.07, popDuration: 140, popEasing: Easing.out(Easing.quad), squash: false, twist: false, flip: false, glitch: false,
    showFlash: false, flashPeak: 0,
    showGlow: false, glowPeakMult: 0, glowStrokeMult: 0,
    burstVariant: 'none', burstDuration: 0,
    mergeParticles: 'none', landWiggle: false,
  },
  retro: {
    popScale: 0.28, popDuration: 80, popEasing: Easing.linear, squash: false, twist: false, flip: false, glitch: false,
    showFlash: true, flashPeak: 0.9,
    showGlow: false, glowPeakMult: 0, glowStrokeMult: 0,
    burstVariant: 'square', burstDuration: 300,
    mergeParticles: 'pixels', landWiggle: false,
  },
  electric: {
    popScale: 0.42, popDuration: 120, popEasing: Easing.out(Easing.exp), squash: false, twist: false, flip: false, glitch: false,
    showFlash: true, flashPeak: 0.7,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'electric', burstDuration: 400,
    mergeParticles: 'sparks', landWiggle: false,
  },
  twist: {
    popScale: 0.25, popDuration: 240, popEasing: Easing.out(Easing.cubic), squash: false, twist: true, flip: false, glitch: false,
    showFlash: true, flashPeak: 0.35,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'classic', burstDuration: 520,
    mergeParticles: 'none', landWiggle: false,
  },
  flip: {
    popScale: 0, popDuration: 0, popEasing: Easing.linear, squash: false, twist: false, flip: true, glitch: false,
    showFlash: true, flashPeak: 0.55,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'classic', burstDuration: 480,
    mergeParticles: 'none', landWiggle: false,
  },
  shatter: {
    popScale: 0.45, popDuration: 70, popEasing: Easing.out(Easing.exp), squash: false, twist: false, flip: false, glitch: false,
    showFlash: true, flashPeak: 0.95,
    showGlow: true, glowPeakMult: 1.0, glowStrokeMult: 1.0,
    burstVariant: 'shatter', burstDuration: 280,
    mergeParticles: 'shatter', landWiggle: false,
  },
  glitch: {
    popScale: 0.35, popDuration: 220, popEasing: Easing.linear, squash: false, twist: false, flip: false, glitch: true,
    showFlash: true, flashPeak: 0.75,
    showGlow: false, glowPeakMult: 0, glowStrokeMult: 0,
    burstVariant: 'none', burstDuration: 0,
    mergeParticles: 'none', landWiggle: false,
  },
};

const PERF_CONFIG: AnimConfig = {
  popScale: 0, popDuration: 0, popEasing: Easing.linear, squash: false, twist: false, flip: false, glitch: false,
  showFlash: false, flashPeak: 0,
  showGlow: false, glowPeakMult: 0, glowStrokeMult: 0,
  burstVariant: 'none', burstDuration: 0,
  mergeParticles: 'none', landWiggle: false,
};

// ─── Dot positions ─────────────────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

// ─── Per-style die face renderers ─────────────────────────────────────────────

function ClassicDie({ x, y, cs, value, faceColor, dotColor }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const dotR = Math.max(cs * 0.085, 3);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      <RoundedRect x={rx} y={ry} width={rw} height={rw} r={8} color={faceColor} />
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
      ))}
    </>
  );
}

function SketchDie({ x, y, cs, value, faceColor, dotColor }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const dotR = Math.max(cs * 0.095, 3.2);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      <RoundedRect x={rx} y={ry} width={rw} height={rw} r={8} color={faceColor} style="stroke" strokeWidth={2.8} />
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={faceColor} style="stroke" strokeWidth={2} />
      ))}
    </>
  );
}

function RoundDie({ x, y, cs, value, faceColor, dotColor }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const cx = rx + rw / 2, cy = ry + rw / 2;
  const dotR = Math.max(cs * 0.078, 2.8);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      <Circle cx={cx} cy={cy} r={rw / 2} color={faceColor} />
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
      ))}
    </>
  );
}

function PixelDie({ x, y, cs, value, faceColor, dotColor }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const pipSize = Math.max(cs * 0.16, 4);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      {/* Sharp-cornered body */}
      <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
      {/* Chunky 2-tone border: light top-left, dark bottom-right for depth */}
      <Rect x={rx} y={ry} width={rw} height={1.5} color="rgba(255,255,255,0.3)" />
      <Rect x={rx} y={ry} width={1.5} height={rw} color="rgba(255,255,255,0.3)" />
      <Rect x={rx} y={ry + rw - 1.5} width={rw} height={1.5} color="rgba(0,0,0,0.3)" />
      <Rect x={rx + rw - 1.5} y={ry} width={1.5} height={rw} color="rgba(0,0,0,0.3)" />
      {/* Square pips */}
      {dots.map(([xf, yf], i) => (
        <Rect
          key={i}
          x={rx + xf * rw - pipSize / 2}
          y={ry + yf * rw - pipSize / 2}
          width={pipSize}
          height={pipSize}
          color={dotColor}
        />
      ))}
    </>
  );
}

function NeonDie({ x, y, cs, value, faceColor, dotColor, perfMode }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string; perfMode?: boolean;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const dotR = Math.max(cs * 0.085, 3);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  return (
    <>
      {/* Very dark background */}
      <RoundedRect x={rx} y={ry} width={rw} height={rw} r={8} color="rgba(6,3,16,0.93)" />
      {/* Outer glow border */}
      <RoundedRect x={rx} y={ry} width={rw} height={rw} r={8} color={faceColor} style="stroke" strokeWidth={2.5}>
        {!perfMode && <BlurMask blur={4} style="solid" />}
      </RoundedRect>
      {/* Inner crisp border ring */}
      <RoundedRect x={rx + 1} y={ry + 1} width={rw - 2} height={rw - 2} r={7} color={faceColor} style="stroke" strokeWidth={0.8} />
      {/* Glowing pips */}
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={faceColor}>
          {!perfMode && <BlurMask blur={2.5} style="solid" />}
        </Circle>
      ))}
      {/* Solid pip core on top */}
      {dots.map(([xf, yf], i) => (
        <Circle key={`s${i}`} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR * 0.55} color={faceColor} />
      ))}
    </>
  );
}

function RaisedDie({ x, y, cs, value, faceColor, dotColor, perfMode }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string; perfMode?: boolean;
}) {
  const pad = 2;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const cx = rx + rw / 2, cy = ry + rw / 2;
  const bevel = Math.max(cs * 0.12, 3);
  const dotR = Math.max(cs * 0.085, 3);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];
  const clip = rrect(rect(rx, ry, rw, rw), 8, 8);
  return (
    <>
      <Group clip={clip}>
        {/* Base face */}
        <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
        {/* Top-left ambient light — radial gradient from corner */}
        {!perfMode && <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
          <RadialGradient c={vec(rx, ry)} r={rw * 1.5} colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']} />
        </Rect>}
        {/* Bottom-right shadow — radial from opposite corner */}
        {!perfMode && <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
          <RadialGradient c={vec(rx + rw, ry + rw)} r={rw * 1.5} colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']} />
        </Rect>}
        {/* Top bevel highlight */}
        <Rect x={rx} y={ry} width={rw} height={bevel} color="rgba(255,255,255,0.48)" />
        {/* Left bevel highlight */}
        <Rect x={rx} y={ry + bevel} width={bevel} height={rw - bevel} color="rgba(255,255,255,0.28)" />
        {/* Bottom bevel shadow */}
        <Rect x={rx} y={ry + rw - bevel} width={rw} height={bevel} color="rgba(0,0,0,0.45)" />
        {/* Right bevel shadow */}
        <Rect x={rx + rw - bevel} y={ry} width={bevel} height={rw - bevel} color="rgba(0,0,0,0.28)" />
      </Group>
      {/* Pips with tiny cast shadow for depth */}
      {dots.map(([xf, yf], i) => (
        <Circle key={`sh${i}`} cx={rx + xf * rw + 1} cy={ry + yf * rw + 1} r={dotR} color="rgba(0,0,0,0.35)" />
      ))}
      {dots.map(([xf, yf], i) => (
        <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
      ))}
    </>
  );
}


const DiceFace = React.memo(function DiceFace({ x, y, cs, value, faceColor, dotColor, diceStyle, perfMode }: {
  x: number; y: number; cs: number; value: CellValue;
  faceColor: string; dotColor: string; diceStyle: DiceStyleId; perfMode?: boolean;
}) {
  switch (diceStyle) {
    case 'sketch':  return <SketchDie  x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} />;
    case 'round':   return <RoundDie   x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} />;
    case 'pixel':   return <PixelDie   x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} />;
    case 'neon':    return <NeonDie    x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} perfMode={perfMode} />;
    case 'raised':  return <RaisedDie  x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} perfMode={perfMode} />;
    default:        return <ClassicDie x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} />;
  }
});

const StaticTile = React.memo(function StaticTile({ x, y, cs, value, faceColor, dotColor, opacity = 1, diceStyle, perfMode }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
  opacity?: number; diceStyle: DiceStyleId; perfMode?: boolean;
}) {
  return (
    <Group opacity={opacity}>
      <DiceFace x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} diceStyle={diceStyle} perfMode={perfMode} />
    </Group>
  );
});

// ─── PopTile ──────────────────────────────────────────────────────────────────
// Normal packs: uniform scale pop.
// Juicy: squash-and-stretch with spring physics for a jelly/blob feel.
function PopTile({ x, y, cs, value, faceColor, dotColor, cfg, diceStyle, perfMode }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
  cfg: AnimConfig; diceStyle: DiceStyleId; perfMode?: boolean;
}) {
  const pad = 2;
  const cx = x + cs / 2, cy = y + cs / 2;

  const pop = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const tx = useSharedValue(0); // glitch translateX
  const ty = useSharedValue(0); // glitch translateY

  useEffect(() => {
    if (cfg.squash) {
      const springCfg = { mass: 0.6, damping: 6, stiffness: 190 };
      sx.value = withSequence(
        withTiming(1.75, { duration: 50, easing: Easing.out(Easing.quad) }),
        withSpring(1, springCfg),
      );
      sy.value = withSequence(
        withTiming(0.48, { duration: 50, easing: Easing.out(Easing.quad) }),
        withSpring(1, springCfg),
      );
    } else if (cfg.twist) {
      pop.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      sx.value = withSequence(
        withTiming(1.18, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(1,    { duration: 110, easing: Easing.in(Easing.quad) }),
      );
    } else if (cfg.flip) {
      // Card flip: scaleY 1→0→1, slight scaleX expand, flash peaks at midpoint
      sy.value = withSequence(
        withTiming(0, { duration: 90, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      );
      sx.value = withSequence(
        withTiming(1.1, { duration: 90 }),
        withTiming(1,   { duration: 90 }),
      );
      // Drive pop for flash — peaks at midpoint (90ms)
      pop.value = withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0, { duration: 90 }),
      );
    } else if (cfg.glitch) {
      // Aggressive jitter: large X+Y displacement, erratic scale via pop
      tx.value = withSequence(
        withTiming(-14, { duration: 30 }), withTiming(12,  { duration: 30 }),
        withTiming(-10, { duration: 30 }), withTiming(9,   { duration: 30 }),
        withTiming(-6,  { duration: 30 }), withTiming(5,   { duration: 30 }),
        withTiming(-2,  { duration: 30 }), withTiming(0,   { duration: 30 }),
      );
      ty.value = withSequence(
        withTiming(6,  { duration: 40 }), withTiming(-8,  { duration: 40 }),
        withTiming(5,  { duration: 40 }), withTiming(-4,  { duration: 40 }),
        withTiming(0,  { duration: 40 }),
      );
      pop.value = withSequence(
        withTiming(1,   { duration: 40 }),
        withTiming(0.1, { duration: 30 }),
        withTiming(0.9, { duration: 30 }),
        withTiming(0.2, { duration: 30 }),
        withTiming(1,   { duration: 30 }),
        withTiming(0,   { duration: 60 }),
      );
    } else {
      pop.value = withTiming(1, { duration: cfg.popDuration, easing: cfg.popEasing });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniformTransform = useDerivedValue(() => {
    'worklet';
    return [{ scale: 1 + cfg.popScale * Math.sin(Math.PI * pop.value) }];
  });
  const squashTransform = useDerivedValue(() => {
    'worklet';
    return [{ scaleX: sx.value }, { scaleY: sy.value }];
  });
  const twistTransform = useDerivedValue(() => {
    'worklet';
    return [{ rotate: pop.value * Math.PI * 2 }, { scale: sx.value }];
  });
  const glitchTransform = useDerivedValue(() => {
    'worklet';
    return [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1 + cfg.popScale * Math.sin(Math.PI * pop.value) }];
  });
  const flashOpacity = useDerivedValue(() => {
    'worklet';
    return cfg.flashPeak * Math.sin(Math.PI * pop.value);
  });

  const transform = cfg.squash ? squashTransform
    : cfg.twist   ? twistTransform
    : cfg.flip    ? squashTransform  // flip reuses scaleX/scaleY transform
    : cfg.glitch  ? glitchTransform
    : uniformTransform;

  return (
    <Group origin={{ x: cx, y: cy }} transform={transform}>
      <DiceFace x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} diceStyle={diceStyle} perfMode={perfMode} />
      {cfg.showFlash && (
        <RoundedRect
          x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} r={8}
          color="#ffffff" opacity={flashOpacity}
        />
      )}
    </Group>
  );
}

// ─── WiggleTile — jiggles left-right on landing (Juicy only) ─────────────────
function WiggleTile({ x, y, cs, value, faceColor, dotColor, diceStyle, perfMode }: {
  x: number; y: number; cs: number; value: CellValue; faceColor: string; dotColor: string;
  diceStyle: DiceStyleId; perfMode?: boolean;
}) {
  const tx = useSharedValue(0);
  useEffect(() => {
    const a = cs * 0.045; // subtle — about 4.5% of cell size
    tx.value = withSequence(
      withTiming(-a,        { duration: 40, easing: Easing.out(Easing.quad) }),
      withSpring(0, { mass: 0.4, damping: 5, stiffness: 280 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const transform = useDerivedValue(() => { 'worklet'; return [{ translateX: tx.value }]; });
  return (
    <Group transform={transform}>
      <DiceFace x={x} y={y} cs={cs} value={value} faceColor={faceColor} dotColor={dotColor} diceStyle={diceStyle} perfMode={perfMode} />
    </Group>
  );
}

// ─── Retro: pixel burst ───────────────────────────────────────────────────────
// 8 small squares fly out in cardinal + diagonal directions, linear, then vanish.

const PIXEL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315].map(d => (d * Math.PI) / 180);

function PixelParticle({ cx, cy, angle, maxDist, size, color, p }: {
  cx: number; cy: number; angle: number; maxDist: number; size: number;
  color: string; p: ReturnType<typeof useSharedValue<number>>;
}) {
  const dx = Math.cos(angle) * maxDist;
  const dy = Math.sin(angle) * maxDist;
  const px = useDerivedValue(() => { 'worklet'; return cx + dx * p.value - size / 2; });
  const py = useDerivedValue(() => { 'worklet'; return cy + dy * p.value - size / 2; });
  const op = useDerivedValue(() => { 'worklet'; return 1 - p.value; });
  return <Rect x={px} y={py} width={size} height={size} color={color} opacity={op} />;
}

function PixelBurst({ cx, cy, cs, color, onDone }: {
  cx: number; cy: number; cs: number; color: string; onDone: () => void;
}) {
  const p = useSharedValue(0);
  const maxDist = cs * 0.8;
  const size = Math.max(Math.round(cs * 0.12), 3);
  useEffect(() => {
    p.value = withTiming(1, { duration: 190, easing: Easing.linear });
    const t = setTimeout(onDone, 230);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {PIXEL_ANGLES.map((angle, i) => (
        <PixelParticle key={i} cx={cx} cy={cy} angle={angle} maxDist={maxDist} size={size} color={color} p={p} />
      ))}
    </>
  );
}

// ─── Electric: spark burst ────────────────────────────────────────────────────
// 8 bright oval sparks shoot out very fast, fade with a tail blur.

const SPARK_ANGLES = [0, 22.5, 67.5, 90, 135, 157.5, 202.5, 270].map(d => (d * Math.PI) / 180);

function SparkParticle({ cx, cy, angle, maxDist, r, color, p }: {
  cx: number; cy: number; angle: number; maxDist: number; r: number;
  color: string; p: ReturnType<typeof useSharedValue<number>>;
}) {
  const dx = Math.cos(angle) * maxDist;
  const dy = Math.sin(angle) * maxDist;
  const pcx = useDerivedValue(() => { 'worklet'; return cx + dx * p.value; });
  const pcy = useDerivedValue(() => { 'worklet'; return cy + dy * p.value; });
  const op  = useDerivedValue(() => { 'worklet'; return 0.95 * (1 - p.value * p.value); });
  const pr  = useDerivedValue(() => { 'worklet'; return r * (1 - p.value * 0.5); });
  return (
    <Circle cx={pcx} cy={pcy} r={pr} color={color} opacity={op}>
      <BlurMask blur={2} style="solid" />
    </Circle>
  );
}

// Core flash at impact point
function SparkCoreFlash({ cx, cy, cs, color, p }: {
  cx: number; cy: number; cs: number; color: string;
  p: ReturnType<typeof useSharedValue<number>>;
}) {
  const r  = useDerivedValue(() => { 'worklet'; return cs * 0.5 * (1 - Math.min(p.value * 3, 1)); });
  const op = useDerivedValue(() => { 'worklet'; return 1.0 * (1 - Math.min(p.value * 3, 1)); });
  return (
    <Circle cx={cx} cy={cy} r={r} color={color} opacity={op}>
      <BlurMask blur={5} style="solid" />
    </Circle>
  );
}

function SparkBurst({ cx, cy, cs, color, onDone }: {
  cx: number; cy: number; cs: number; color: string; onDone: () => void;
}) {
  const p = useSharedValue(0);
  const maxDist = cs * 1.1;
  const r = Math.max(cs * 0.075, 2.5);
  useEffect(() => {
    p.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    const t = setTimeout(onDone, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <SparkCoreFlash cx={cx} cy={cy} cs={cs} color={color} p={p} />
      {SPARK_ANGLES.map((angle, i) => (
        <SparkParticle key={i} cx={cx} cy={cy} angle={angle} maxDist={maxDist} r={r} color={color} p={p} />
      ))}
    </>
  );
}

// ─── 6-clear burst variants ───────────────────────────────────────────────────

function BurstClassic({ x, y, cs, color, duration, onDone }: {
  x: number; y: number; cs: number; color: string; duration: number; onDone: () => void;
}) {
  const p = useSharedValue(0);
  const cx = x + cs / 2, cy = y + cs / 2;
  useEffect(() => {
    p.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    const t = setTimeout(onDone, duration + 40);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringR  = useDerivedValue(() => { 'worklet'; return cs * (0.25 + 1.05 * p.value); });
  const ringOp = useDerivedValue(() => { 'worklet'; return 0.85 * (1 - p.value); });
  const ringW  = useDerivedValue(() => { 'worklet'; return 2 + 5 * (1 - p.value); });
  const flashR = useDerivedValue(() => { 'worklet'; return cs * 0.55 * Math.sin(Math.PI * Math.min(p.value * 1.6, 1)); });
  const flashOp= useDerivedValue(() => { 'worklet'; return 0.8 * (1 - Math.min(p.value * 1.4, 1)); });
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={flashR} color={color} opacity={flashOp}><BlurMask blur={6} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={ringR} style="stroke" strokeWidth={ringW} color={color} opacity={ringOp}><BlurMask blur={4} style="solid" /></Circle>
    </Group>
  );
}

function BurstMulti({ x, y, cs, color, duration, onDone }: {
  x: number; y: number; cs: number; color: string; duration: number; onDone: () => void;
}) {
  const p1 = useSharedValue(0), p2 = useSharedValue(0), p3 = useSharedValue(0);
  const cx = x + cs / 2, cy = y + cs / 2;
  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    p1.value = withTiming(1, { duration, easing: ease });
    p2.value = withDelay(80,  withTiming(1, { duration: duration * 0.85, easing: ease }));
    p3.value = withDelay(160, withTiming(1, { duration: duration * 0.70, easing: ease }));
    const t = setTimeout(onDone, duration + 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Using separate derived values avoids hooks-in-loop
  const r1 = useDerivedValue(() => { 'worklet'; return cs * (0.15 + 1.1 * p1.value); });
  const op1= useDerivedValue(() => { 'worklet'; return 0.9 * (1 - p1.value); });
  const w1 = useDerivedValue(() => { 'worklet'; return 1.5 + 4 * (1 - p1.value); });
  const r2 = useDerivedValue(() => { 'worklet'; return cs * (0.15 + 0.85 * p2.value); });
  const op2= useDerivedValue(() => { 'worklet'; return 0.85 * (1 - p2.value); });
  const w2 = useDerivedValue(() => { 'worklet'; return 1.5 + 3 * (1 - p2.value); });
  const r3 = useDerivedValue(() => { 'worklet'; return cs * (0.15 + 0.60 * p3.value); });
  const op3= useDerivedValue(() => { 'worklet'; return 0.7 * (1 - p3.value); });
  const w3 = useDerivedValue(() => { 'worklet'; return 1 + 2.5 * (1 - p3.value); });
  const fR = useDerivedValue(() => { 'worklet'; return cs * 0.6 * Math.sin(Math.PI * Math.min(p1.value * 1.4, 1)); });
  const fOp= useDerivedValue(() => { 'worklet'; return 0.7 * (1 - Math.min(p1.value * 1.2, 1)); });
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={fR} color={color} opacity={fOp}><BlurMask blur={8} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={r1} style="stroke" strokeWidth={w1} color={color} opacity={op1}><BlurMask blur={4} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={r2} style="stroke" strokeWidth={w2} color={color} opacity={op2}><BlurMask blur={3} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={r3} style="stroke" strokeWidth={w3} color={color} opacity={op3}><BlurMask blur={2} style="solid" /></Circle>
    </Group>
  );
}

function BurstSquare({ x, y, cs, color, duration, onDone }: {
  x: number; y: number; cs: number; color: string; duration: number; onDone: () => void;
}) {
  const p = useSharedValue(0);
  const pad = 2;
  useEffect(() => {
    p.value = withTiming(1, { duration, easing: Easing.linear });
    const t = setTimeout(onDone, duration + 20);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const expand = useDerivedValue(() => { 'worklet'; return cs * 0.35 * p.value; });
  const bOp   = useDerivedValue(() => { 'worklet'; return 0.9 * (1 - p.value); });
  const fOp   = useDerivedValue(() => { 'worklet'; return 0.85 * (1 - Math.min(p.value * 2, 1)); });
  const bx    = useDerivedValue(() => { 'worklet'; return x + pad - expand.value; });
  const by    = useDerivedValue(() => { 'worklet'; return y + pad - expand.value; });
  const bw    = useDerivedValue(() => { 'worklet'; return (cs - pad * 2) + expand.value * 2; });
  return (
    <Group>
      <Rect x={x + pad} y={y + pad} width={cs - pad * 2} height={cs - pad * 2} color={color} opacity={fOp} />
      <Rect x={bx} y={by} width={bw} height={bw} style="stroke" strokeWidth={2} color={color} opacity={bOp} />
    </Group>
  );
}

function BurstElectric({ x, y, cs, color, duration, onDone }: {
  x: number; y: number; cs: number; color: string; duration: number; onDone: () => void;
}) {
  const p1 = useSharedValue(0), p2 = useSharedValue(0);
  const cx = x + cs / 2, cy = y + cs / 2;
  useEffect(() => {
    const ease = Easing.out(Easing.exp);
    p1.value = withTiming(1, { duration, easing: ease });
    p2.value = withDelay(50, withTiming(1, { duration: duration * 0.7, easing: ease }));
    const t = setTimeout(onDone, duration + 40);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const r1 = useDerivedValue(() => { 'worklet'; return cs * (0.2 + 1.3 * p1.value); });
  const op1= useDerivedValue(() => { 'worklet'; return 0.95 * (1 - p1.value); });
  const w1 = useDerivedValue(() => { 'worklet'; return 1 + 3 * (1 - p1.value); });
  const r2 = useDerivedValue(() => { 'worklet'; return cs * (0.2 + 0.8 * p2.value); });
  const op2= useDerivedValue(() => { 'worklet'; return 0.7 * (1 - p2.value); });
  const w2 = useDerivedValue(() => { 'worklet'; return 1 + 2 * (1 - p2.value); });
  const fR = useDerivedValue(() => { 'worklet'; return cs * 0.7 * (1 - Math.min(p1.value * 2.5, 1)); });
  const fOp= useDerivedValue(() => { 'worklet'; return 1.0 * (1 - Math.min(p1.value * 2.5, 1)); });
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={fR} color={color} opacity={fOp}><BlurMask blur={10} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={r1} style="stroke" strokeWidth={w1} color={color} opacity={op1}><BlurMask blur={3} style="solid" /></Circle>
      <Circle cx={cx} cy={cy} r={r2} style="stroke" strokeWidth={w2} color={color} opacity={op2}><BlurMask blur={2} style="solid" /></Circle>
    </Group>
  );
}

// ─── ShatterMergeBurst — fires on every shatter merge ─────────────────────────
// 8 colored rectangular shards fly across the board and spin as they go.
const SHATTER_SHARD_PARAMS: [number, number, number, number, number][] = [
  // [angle,               distFactor, widthFactor, heightFactor, spin]
  [0,                      4.2,        0.32,        0.20,         1.5],
  [Math.PI * 0.22,         3.8,        0.25,        0.16,        -1.8],
  [Math.PI * 0.50,         4.5,        0.35,        0.22,         2.0],
  [Math.PI * 0.72,         3.5,        0.22,        0.14,        -1.3],
  [Math.PI,                4.0,        0.30,        0.19,         1.7],
  [Math.PI * 1.25,         3.9,        0.27,        0.17,        -2.1],
  [Math.PI * 1.50,         4.3,        0.33,        0.21,         1.4],
  [Math.PI * 1.78,         3.6,        0.24,        0.15,        -1.6],
];

function ShatterShard({ cx, cy, angle, dist, w, h, color, spin }: {
  cx: number; cy: number; angle: number; dist: number;
  w: number; h: number; color: string; spin: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.quad) });
  }, []);
  const transform = useDerivedValue(() => {
    'worklet';
    const dx = Math.cos(angle) * p.value * dist;
    const dy = Math.sin(angle) * p.value * dist;
    const rot = spin * p.value * Math.PI * 2;
    return [{ translateX: dx }, { translateY: dy }, { rotate: rot }];
  });
  const op = useDerivedValue(() => { 'worklet'; return Math.pow(1 - p.value, 0.65); });
  return (
    <Group origin={{ x: cx, y: cy }} transform={transform}>
      <RoundedRect x={cx - w / 2} y={cy - h / 2} width={w} height={h} r={2} color={color} opacity={op} />
    </Group>
  );
}

function ShatterMergeBurst({ cx, cy, cs, color, onDone }: {
  cx: number; cy: number; cs: number; color: string; onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 530);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      {SHATTER_SHARD_PARAMS.map(([angle, distF, wF, hF, spin], i) => (
        <ShatterShard
          key={i}
          cx={cx} cy={cy}
          angle={angle}
          dist={cs * distF}
          w={cs * wF} h={cs * hF}
          color={color}
          spin={spin}
        />
      ))}
    </>
  );
}

// ─── BurstShatter ─────────────────────────────────────────────────────────────
// 12 small squares fly outward in all directions and fade quickly.
const SHATTER_ANGLES = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);

function ShatterParticle({ cx, cy, angle, maxDist, duration }: {
  cx: number; cy: number; angle: number; maxDist: number; duration: number;
}) {
  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
  }, []);
  const animProps = useDerivedValue(() => {
    'worklet';
    const d = prog.value * maxDist;
    return { x: cx + Math.cos(angle) * d, y: cy + Math.sin(angle) * d, op: 1 - prog.value };
  });
  const size = maxDist * 0.18;
  return (
    <Rect
      x={animProps.value.x - size / 2}
      y={animProps.value.y - size / 2}
      width={size} height={size}
      color="#ffffff"
      opacity={animProps.value.op}
    />
  );
}

function BurstShatter({ x, y, cs, duration, onDone }: {
  x: number; y: number; cs: number; duration: number; onDone: () => void;
}) {
  const cx = x + cs / 2, cy = y + cs / 2;
  useEffect(() => {
    const t = setTimeout(onDone, duration + 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      {SHATTER_ANGLES.map((angle, i) => (
        <ShatterParticle key={i} cx={cx} cy={cy} angle={angle} maxDist={cs * 0.9} duration={duration} />
      ))}
    </>
  );
}

function Burst({ x, y, cs, color, cfg, onDone }: {
  x: number; y: number; cs: number; color: string; cfg: AnimConfig; onDone: () => void;
}) {
  switch (cfg.burstVariant) {
    case 'multi':    return <BurstMulti    x={x} y={y} cs={cs} color={color} duration={cfg.burstDuration} onDone={onDone} />;
    case 'square':   return <BurstSquare   x={x} y={y} cs={cs} color={color} duration={cfg.burstDuration} onDone={onDone} />;
    case 'electric': return <BurstElectric x={x} y={y} cs={cs} color={color} duration={cfg.burstDuration} onDone={onDone} />;
    case 'shatter':  return <BurstShatter  x={x} y={y} cs={cs} duration={cfg.burstDuration} onDone={onDone} />;
    case 'none':     return null;
    default:         return <BurstClassic  x={x} y={y} cs={cs} color={color} duration={cfg.burstDuration} onDone={onDone} />;
  }
}

// ─── Main GameBoard ────────────────────────────────────────────────────────────
interface Props {
  board: Board;
  activePiece: ActivePiece | null;
  ghostAnchorRow: number | null;
  cellSize: number;
  chainPass: number;
  mergeEvents: MergeEvent[];
}

interface MergeBurst { id: string; cx: number; cy: number; color: string }

const GameBoard = React.memo(function GameBoard({ board, activePiece, ghostAnchorRow, cellSize, chainPass, mergeEvents }: Props) {
  const { colors } = useTheme();
  const { faceColor, dotColor } = useDieColors();
  const { animPack, performanceMode } = useAnimation();
  const { diceStyle } = useDiceStyle();
  const cfg = performanceMode ? PERF_CONFIG : ANIM_CONFIGS[animPack];
  const cs = cellSize;
  const boardW = cs * COLS;
  const boardH = cs * ROWS;
  const gridColor = colors.gridLine ?? colors.separator;


  // ── 6-clear bursts ─────────────────────────────────────────────────────────
  const [bursts, setBursts] = useState<Array<{ id: string; r: number; c: number }>>([]);
  const burstSeq = useRef(0);
  useEffect(() => {
    if (cfg.burstVariant === 'none') return;
    const clears = mergeEvents.filter(e => e.newValue === 'clear');
    if (clears.length === 0) return;
    const added = clears.map(e => ({ id: `b${burstSeq.current++}`, r: e.dest[0], c: e.dest[1] }));
    setBursts(prev => [...prev, ...added]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeEvents]);
  const removeBurst = useCallback((id: string) => {
    setBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── Wiggle-on-land: fires the moment active piece touches the surface ────────
  const [activePieceLanding, setActivePieceLanding] = useState(false);
  const wasLandedRef = useRef(false);
  useEffect(() => {
    if (!cfg.landWiggle || !activePiece || ghostAnchorRow === null) {
      wasLandedRef.current = false;
      return;
    }
    const isLanded = activePiece.anchorRow === ghostAnchorRow;
    if (isLanded && !wasLandedRef.current) {
      setActivePieceLanding(true);
      setTimeout(() => setActivePieceLanding(false), 360);
    }
    wasLandedRef.current = isLanded;
  }, [activePiece, ghostAnchorRow, cfg.landWiggle]);

  // ── Per-merge particle bursts (retro pixels / electric sparks) ─────────────
  const [mergeBursts, setMergeBursts] = useState<MergeBurst[]>([]);
  const mergeBurstSeq = useRef(0);
  const removeMergeBurst = useCallback((id: string) => {
    setMergeBursts(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── Merge detection → pop tiles + glow + merge particles ──────────────────
  const glow = useSharedValue(0);
  const seenIds = useRef<Set<string>>(new Set());
  const [popCells, setPopCells] = useState<Set<string>>(new Set());
  const chainPassRef = useRef(chainPass);
  chainPassRef.current = chainPass;

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
      if (!performanceMode) setPopCells(new Set(freshMerged));

      // Per-merge particle effects
      if (!performanceMode && cfg.mergeParticles !== 'none') {
        const newBursts: MergeBurst[] = freshMerged.map(key => {
          const [r, c] = key.split(',').map(Number);
          const cell = board[r]?.[c];
          return {
            id: `mp${mergeBurstSeq.current++}`,
            cx: c * cs + cs / 2,
            cy: r * cs + cs / 2,
            color: cell ? faceColor(cell.value) : '#ffffff',
          };
        });
        setMergeBursts(prev => [...prev, ...newBursts]);
      }

      if (cfg.showGlow) {
        const pass = chainPassRef.current;
        const peak = Math.min((0.22 + Math.max(0, pass - 1) * 0.26) * cfg.glowPeakMult, 1);
        const gap  = chainResolveDelay(pass);
        const rise = Math.min(90, gap * 0.3);
        const fade = Math.max(140, gap - rise);
        glow.value = 0;
        glow.value = withSequence(
          withTiming(peak, { duration: rise, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: fade, easing: Easing.in(Easing.quad) }),
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const glowOpacity = useDerivedValue(() => { 'worklet'; return glow.value; });
  const glowStroke  = useDerivedValue(() => {
    'worklet';
    return (2 + glow.value * 7) * cfg.glowStrokeMult;
  });

  // ── Render layers ──────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const path = Skia.Path.Make();
    for (let r = 0; r <= ROWS; r++) {
      const y = r === ROWS ? boardH - 0.5 : r * cs + 0.5;
      path.moveTo(0, y);
      path.lineTo(boardW, y);
    }
    for (let c = 0; c <= COLS; c++) {
      const x = c === COLS ? boardW - 0.5 : c * cs + 0.5;
      path.moveTo(x, 0);
      path.lineTo(x, boardH);
    }
    return <Path path={path} style="stroke" strokeWidth={1} color={gridColor} />;
  }, [cs, boardW, boardH, gridColor]);

  const boardTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell) continue;
        if (popCells.has(`${r},${c}`)) continue;
        tiles.push(
          <StaticTile key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value}
            faceColor={faceColor(cell.value)} dotColor={dotColor(cell.value)} diceStyle={diceStyle} perfMode={performanceMode} />
        );
      }
    }
    return tiles;
  }, [board, cs, faceColor, dotColor, popCells, diceStyle]);

  const popTiles = useMemo(() => {
    if (popCells.size === 0) return null;
    const out: React.ReactNode[] = [];
    popCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = board[r]?.[c];
      if (!cell) return;
      out.push(
        <PopTile key={cell.id} x={c * cs} y={r * cs} cs={cs} value={cell.value}
          faceColor={faceColor(cell.value)} dotColor={dotColor(cell.value)} cfg={cfg} diceStyle={diceStyle} perfMode={performanceMode} />
      );
    });
    return out;
  }, [popCells, board, cs, faceColor, dotColor, cfg, diceStyle]);

  const ghostTiles = useMemo(() => {
    if (!activePiece || ghostAnchorRow === null || ghostAnchorRow === activePiece.anchorRow) return null;
    return activePiece.tiles.map((t, i) => {
      const r = ghostAnchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return (
        <StaticTile key={`ghost_${i}`} x={c * cs} y={r * cs} cs={cs} value={t.value}
          faceColor={faceColor(t.value)} dotColor={dotColor(t.value)} opacity={0.18} diceStyle={diceStyle} perfMode={performanceMode} />
      );
    });
  }, [activePiece, ghostAnchorRow, cs, faceColor, dotColor, diceStyle]);

  const activeTiles = useMemo(() => {
    if (!activePiece) return null;
    const wiggling = cfg.landWiggle && activePieceLanding;
    return activePiece.tiles.map((t, i) => {
      const r = activePiece.anchorRow + t.dr;
      const c = activePiece.anchorCol + t.dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      const x = c * cs, y = r * cs;
      return wiggling
        ? <WiggleTile key={`active_${i}`} x={x} y={y} cs={cs} value={t.value}
            faceColor={faceColor(t.value)} dotColor={dotColor(t.value)} diceStyle={diceStyle} perfMode={performanceMode} />
        : <StaticTile key={`active_${i}`} x={x} y={y} cs={cs} value={t.value}
            faceColor={faceColor(t.value)} dotColor={dotColor(t.value)} diceStyle={diceStyle} perfMode={performanceMode} />;
    });
  }, [activePiece, cs, faceColor, dotColor, cfg.landWiggle, activePieceLanding, diceStyle]);

  return (
    <Canvas style={{ width: boardW, height: boardH }}>
      <RoundedRect x={0} y={0} width={boardW} height={boardH} r={0} color={colors.surface} />
      {gridLines}
      {boardTiles}
      {ghostTiles}
      {activeTiles}
      {popTiles}

      {/* Per-merge particle effects */}
      {mergeBursts.map(b =>
        cfg.mergeParticles === 'pixels'   ? <PixelBurst        key={b.id} cx={b.cx} cy={b.cy} cs={cs} color={b.color}   onDone={() => removeMergeBurst(b.id)} />
        : cfg.mergeParticles === 'shatter' ? <ShatterMergeBurst key={b.id} cx={b.cx} cy={b.cy} cs={cs} color={b.color}   onDone={() => removeMergeBurst(b.id)} />
        :                                    <SparkBurst        key={b.id} cx={b.cx} cy={b.cy} cs={cs} color="#ffffff"   onDone={() => removeMergeBurst(b.id)} />
      )}

      {/* 6-clear celebratory bursts */}
      {bursts.map(b => (
        <Burst
          key={b.id}
          x={b.c * cs} y={b.r * cs} cs={cs}
          color={colors.premiumGold}
          cfg={cfg}
          onDone={() => removeBurst(b.id)}
        />
      ))}

      {cfg.showGlow && (
        <RoundedRect
          x={2} y={2} width={boardW - 4} height={boardH - 4} r={6}
          style="stroke" strokeWidth={glowStroke} color={colors.accent} opacity={glowOpacity}
        >
          <BlurMask blur={6} style="solid" />
        </RoundedRect>
      )}

    </Canvas>
  );
});

export default GameBoard;
