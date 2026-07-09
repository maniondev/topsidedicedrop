import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Platform, useWindowDimensions } from 'react-native';
import {
  Canvas, Group, Rect, Circle, Path, LinearGradient, BlurMask, vec, Skia,
} from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { ATMOSPHERE, Atmosphere } from '@/constants/atmosphere';

// Lower particle counts on Android — it's the frame-budget-constrained platform
// (documented low-end slowdown), and the atmosphere is decorative.
const LOW = Platform.OS === 'android';

// A single leaf/petal silhouette, centered on the origin so it rotates cleanly.
const LEAF_PATH = Skia.Path.MakeFromSVGString('M0 -7 C5 -4 5 4 0 7 C-5 4 -5 -4 0 -7 Z')!;
const LEAF_COLORS = ['#3E6B3A', '#4E7A44', '#6B8E4E', '#C4956A', '#8AA85A'];

interface SeedLeaf { baseX: number; baseY: number; fall: number; swayF: number; swayA: number; phase: number; rotF: number; scale: number; opacity: number; color: string }
interface SeedFly  { baseX: number; baseY: number; fx: number; fy: number; ax: number; ay: number; px: number; py: number; blink: number; pb: number; r: number }

function Leaf({ clock, s, H }: { clock: SharedValue<number>; s: SeedLeaf; H: number }) {
  const transform = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 1000;
    const y = ((s.baseY + t * s.fall) % (H + 60)) - 30;      // fall + wrap
    const x = s.baseX + Math.sin(t * s.swayF + s.phase) * s.swayA;
    const rot = t * s.rotF + s.phase;
    return [{ translateX: x }, { translateY: y }, { rotate: rot }, { scale: s.scale }];
  });
  return (
    <Group transform={transform} opacity={s.opacity}>
      <Path path={LEAF_PATH} color={s.color} />
    </Group>
  );
}

function Firefly({ clock, s, color }: { clock: SharedValue<number>; s: SeedFly; color: string }) {
  const cx = useDerivedValue(() => { 'worklet'; return s.baseX + Math.sin(clock.value / 1000 * s.fx + s.px) * s.ax; });
  const cy = useDerivedValue(() => { 'worklet'; return s.baseY + Math.cos(clock.value / 1000 * s.fy + s.py) * s.ay; });
  const opacity = useDerivedValue(() => {
    'worklet';
    return 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(clock.value / 1000 * s.blink + s.pb));
  });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={s.r} color={color}>
        <BlurMask blur={s.r * 1.8} style="normal" />
      </Circle>
    </Group>
  );
}

function ForestAmbient({ clock, W, H, particle }: { clock: SharedValue<number>; W: number; H: number; particle: string }) {
  const leaves = useMemo<SeedLeaf[]>(() => {
    const n = LOW ? 5 : 8;
    return Array.from({ length: n }, () => ({
      baseX: Math.random() * W,
      baseY: Math.random() * H,
      fall: 18 + Math.random() * 26,
      swayF: 0.5 + Math.random() * 0.9,
      swayA: 10 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      rotF: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.8),
      scale: 0.8 + Math.random() * 1.1,
      opacity: 0.28 + Math.random() * 0.30,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    }));
  }, [W, H]);

  const flies = useMemo<SeedFly[]>(() => {
    const n = LOW ? 6 : 10;
    return Array.from({ length: n }, () => ({
      baseX: Math.random() * W,
      baseY: H * 0.35 + Math.random() * H * 0.6,   // hover in the lower two-thirds
      fx: 0.3 + Math.random() * 0.6,
      fy: 0.25 + Math.random() * 0.5,
      ax: 16 + Math.random() * 34,
      ay: 12 + Math.random() * 26,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      blink: 0.8 + Math.random() * 1.6,
      pb: Math.random() * Math.PI * 2,
      r: 1.6 + Math.random() * 2.2,
    }));
  }, [W, H]);

  return (
    <>
      {leaves.map((s, i) => <Leaf key={`l${i}`} clock={clock} s={s} H={H} />)}
      {flies.map((s, i) => <Firefly key={`f${i}`} clock={clock} s={s} color={particle} />)}
    </>
  );
}

// Soft blob of light — used for dappled sun / caustic pools / neon bloom.
function GlowBlob({ x, y, r, color, opacity }: { x: number; y: number; r: number; color: string; opacity: number }) {
  return (
    <Circle cx={x} cy={y} r={r} color={color} opacity={opacity}>
      <BlurMask blur={r * 0.7} style="normal" />
    </Circle>
  );
}

function Background({ a, W, H }: { a: Atmosphere; W: number; H: number }) {
  return (
    <Group>
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={a.gradient} />
      </Rect>
      {a.background === 'forest' && (
        <>
          <GlowBlob x={W * 0.22} y={H * 0.14} r={W * 0.42} color={a.glow} opacity={0.16} />
          <GlowBlob x={W * 0.82} y={H * 0.30} r={W * 0.36} color={a.glow} opacity={0.10} />
        </>
      )}
      {a.background === 'ocean' && (
        <>
          <GlowBlob x={W * 0.30} y={H * 0.08} r={W * 0.55} color={a.glow} opacity={0.14} />
          <GlowBlob x={W * 0.75} y={H * 0.18} r={W * 0.40} color={a.glow} opacity={0.10} />
        </>
      )}
      {a.background === 'neon' && (
        <>
          <GlowBlob x={W * 0.5} y={H * 0.42} r={W * 0.7} color={a.glow} opacity={0.22} />
        </>
      )}
    </Group>
  );
}

interface Props {
  // Ambient particle signatures. On the game screen we want the gradient
  // background but NOT drifting leaves/fireflies over the falling dice.
  showAmbient?: boolean;
}

// Renders a full-bleed atmosphere layer. Meant to be dropped into a NON-padded
// full-screen container (the tab navigator wrapper, or a bare wrapper on the
// game screen) as an absolute fill — that's what makes coverage reach every
// edge without per-screen padding math.
export default function ThemeAtmosphere({ showAmbient = true }: Props) {
  const { themeId } = useTheme();
  const { width, height } = useWindowDimensions();
  const a = ATMOSPHERE[themeId];

  const clock = useSharedValue(0);
  // Start inactive; only spin the per-frame worklet when this instance actually
  // shows moving ambient (plain themes and the game screen pay nothing).
  const frame = useFrameCallback((info) => { 'worklet'; clock.value = info.timeSinceFirstFrame ?? 0; }, false);
  useEffect(() => { frame.setActive(!!a && showAmbient); }, [a, showAmbient, frame]);

  if (!a) return null;

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Background a={a} W={width} H={height} />
      {showAmbient && a.ambient.includes('leaves') && (
        <ForestAmbient clock={clock} W={width} H={height} particle={a.particle} />
      )}
    </Canvas>
  );
}
