import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Platform, useWindowDimensions } from 'react-native';
import {
  Canvas, Group, Rect, Circle, Path, LinearGradient, BlurMask, vec, Skia,
} from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback, useDerivedValue, SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { useAnimation } from '@/contexts/AnimationContext';
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

interface SeedBubble { baseX: number; offset: number; speed: number; wobF: number; wobA: number; phase: number; r: number; sw: number; opacity: number }
interface SeedCaustic { baseX: number; y: number; r: number; f: number; a: number; p: number; of: number; op: number; base: number; amp: number }

function Bubble({ clock, s, H, color }: { clock: SharedValue<number>; s: SeedBubble; H: number; color: string }) {
  const range = H + 80;
  const cy = useDerivedValue(() => {
    'worklet';
    return (H + 40) - (((clock.value / 1000) * s.speed + s.offset) % range);   // rise + wrap
  });
  const cx = useDerivedValue(() => {
    'worklet';
    return s.baseX + Math.sin(clock.value / 1000 * s.wobF + s.phase) * s.wobA;  // gentle wobble
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    const y = (H + 40) - (((clock.value / 1000) * s.speed + s.offset) % range);
    // fade out as it nears the surface
    const fade = y < H * 0.16 ? Math.max(0, y / (H * 0.16)) : 1;
    return s.opacity * fade;
  });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={s.r} color={color} style="stroke" strokeWidth={s.sw} />
    </Group>
  );
}

// A caustic: a soft pool of light near the surface that slowly drifts side to
// side and shimmers, evoking light dancing on the water.
function Caustic({ clock, s, color }: { clock: SharedValue<number>; s: SeedCaustic; color: string }) {
  const cx = useDerivedValue(() => { 'worklet'; return s.baseX + Math.sin(clock.value / 1000 * s.f + s.p) * s.a; });
  const opacity = useDerivedValue(() => { 'worklet'; return s.base + s.amp * (0.5 + 0.5 * Math.sin(clock.value / 1000 * s.of + s.op)); });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={s.y} r={s.r} color={color}>
        <BlurMask blur={s.r * 0.9} style="normal" />
      </Circle>
    </Group>
  );
}

function OceanAmbient({ clock, W, H, particle }: { clock: SharedValue<number>; W: number; H: number; particle: string }) {
  const bubbles = useMemo<SeedBubble[]>(() => {
    const n = LOW ? 9 : 15;   // mid density
    return Array.from({ length: n }, () => ({
      baseX: Math.random() * W,
      offset: Math.random() * (H + 80),
      speed: 34 + Math.random() * 46,          // mid speed
      wobF: 0.6 + Math.random() * 1.1,
      wobA: 6 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      r: 2 + Math.random() * 6,
      sw: 1 + Math.random() * 1.2,
      opacity: 0.22 + Math.random() * 0.34,
    }));
  }, [W, H]);

  const caustics = useMemo<SeedCaustic[]>(() => {
    const n = LOW ? 2 : 3;
    return Array.from({ length: n }, (_, i) => ({
      baseX: (i + 0.5) * (W / (LOW ? 2 : 3)),
      y: H * (0.06 + Math.random() * 0.14),    // near the surface
      r: W * (0.24 + Math.random() * 0.14),
      f: 0.15 + Math.random() * 0.25,
      a: 20 + Math.random() * 40,
      p: Math.random() * Math.PI * 2,
      of: 0.3 + Math.random() * 0.4,
      op: Math.random() * Math.PI * 2,
      base: 0.05,
      amp: 0.07,
    }));
  }, [W, H]);

  return (
    <>
      {caustics.map((s, i) => <Caustic key={`c${i}`} clock={clock} s={s} color={particle} />)}
      {bubbles.map((s, i) => <Bubble key={`b${i}`} clock={clock} s={s} H={H} color={particle} />)}
    </>
  );
}

const NEON_COLORS = ['#00FFFF', '#9B5CF6', '#00FFAA'];   // cyan / violet / spring-green
interface SeedMote { baseX: number; baseY: number; fx: number; fy: number; ax: number; ay: number; px: number; py: number; blink: number; pb: number; r: number; color: string }

interface SeedStreak { y: number; len: number; speed: number; offset: number; dir: number; w: number; color: string; opacity: number }

// A neon streak — a bright dash with a glowing halo and white-hot core that
// zips across the screen and wraps, like a light trail.
function NeonStreak({ clock, s, W }: { clock: SharedValue<number>; s: SeedStreak; W: number }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, s.y);
    p.lineTo(s.len, s.y);
    return p;
  }, [s]);
  const transform = useDerivedValue(() => {
    'worklet';
    const span = W + s.len + 120;
    const d = ((clock.value / 1000) * s.speed + s.offset) % span;
    return [{ translateX: s.dir > 0 ? -s.len - 60 + d : W + 60 - d }];
  });
  return (
    <Group transform={transform} opacity={s.opacity}>
      <Path path={path} color={s.color} style="stroke" strokeWidth={s.w * 2.6} strokeCap="round">
        <BlurMask blur={s.w * 2.2} style="normal" />
      </Path>
      <Path path={path} color="#FFFFFF" style="stroke" strokeWidth={s.w} strokeCap="round" opacity={0.9} />
    </Group>
  );
}

// A slow throbbing bloom that makes the whole scene pulse with energy.
function NeonPulse({ clock, W, H, color }: { clock: SharedValue<number>; W: number; H: number; color: string }) {
  const opacity = useDerivedValue(() => { 'worklet'; return 0.05 + 0.11 * (0.5 + 0.5 * Math.sin(clock.value / 1000 * 1.5)); });
  return (
    <Group opacity={opacity}>
      <Circle cx={W / 2} cy={H * 0.4} r={W * 0.6} color={color}>
        <BlurMask blur={W * 0.4} style="normal" />
      </Circle>
    </Group>
  );
}

// A neon mote — a bright glowing dot wandering quickly and pulsing.
function NeonMote({ clock, s }: { clock: SharedValue<number>; s: SeedMote }) {
  const cx = useDerivedValue(() => { 'worklet'; return s.baseX + Math.sin(clock.value / 1000 * s.fx + s.px) * s.ax; });
  const cy = useDerivedValue(() => { 'worklet'; return s.baseY + Math.cos(clock.value / 1000 * s.fy + s.py) * s.ay; });
  const opacity = useDerivedValue(() => { 'worklet'; return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.value / 1000 * s.blink + s.pb)); });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={s.r} color={s.color}>
        <BlurMask blur={s.r * 2.2} style="normal" />
      </Circle>
    </Group>
  );
}

function NeonAmbient({ clock, W, H }: { clock: SharedValue<number>; W: number; H: number }) {
  const motes = useMemo<SeedMote[]>(() => {
    const n = LOW ? 11 : 18;   // high energy
    return Array.from({ length: n }, () => ({
      baseX: Math.random() * W,
      baseY: Math.random() * H,
      fx: 0.4 + Math.random() * 0.9,
      fy: 0.35 + Math.random() * 0.8,
      ax: 22 + Math.random() * 48,
      ay: 16 + Math.random() * 42,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      blink: 1.2 + Math.random() * 2.4,
      pb: Math.random() * Math.PI * 2,
      r: 1.6 + Math.random() * 2.8,
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
    }));
  }, [W, H]);

  const streaks = useMemo<SeedStreak[]>(() => {
    const n = LOW ? 4 : 7;
    return Array.from({ length: n }, () => ({
      y: Math.random() * H,
      len: 36 + Math.random() * 100,
      speed: 130 + Math.random() * 230,     // fast
      offset: Math.random() * 2000,
      dir: Math.random() < 0.5 ? 1 : -1,
      w: 1.4 + Math.random() * 2,
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
      opacity: 0.45 + Math.random() * 0.4,
    }));
  }, [W, H]);

  return (
    <>
      <NeonPulse clock={clock} W={W} H={H} color="#9B5CF6" />
      {streaks.map((s, i) => <NeonStreak key={`s${i}`} clock={clock} s={s} W={W} />)}
      {motes.map((s, i) => <NeonMote key={`m${i}`} clock={clock} s={s} />)}
    </>
  );
}

interface SeedBokeh { baseX: number; baseY: number; r: number; fx: number; fy: number; ax: number; ay: number; px: number; py: number; pr: number; base: number; amp: number; color: string }

// A pastel bokeh orb — a big, soft, out-of-focus circle of colour drifting
// slowly and gently breathing. Dreamy on a light background.
function Bokeh({ clock, s }: { clock: SharedValue<number>; s: SeedBokeh }) {
  const cx = useDerivedValue(() => { 'worklet'; return s.baseX + Math.sin(clock.value / 1000 * s.fx + s.px) * s.ax; });
  const cy = useDerivedValue(() => { 'worklet'; return s.baseY + Math.cos(clock.value / 1000 * s.fy + s.py) * s.ay; });
  const opacity = useDerivedValue(() => { 'worklet'; return s.base + s.amp * (0.5 + 0.5 * Math.sin(clock.value / 1000 * 0.4 + s.pr)); });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={s.r} color={s.color}>
        <BlurMask blur={s.r * 0.6} style="normal" />
      </Circle>
    </Group>
  );
}

function PastelAmbient({ clock, W, H, palette }: { clock: SharedValue<number>; W: number; H: number; palette: string[] }) {
  const orbs = useMemo<SeedBokeh[]>(() => {
    const n = LOW ? 8 : 13;
    return Array.from({ length: n }, (_, i) => ({
      baseX: Math.random() * W,
      baseY: Math.random() * H,
      r: 30 + Math.random() * 62,        // big, soft orbs
      fx: 0.12 + Math.random() * 0.22,   // slow drift
      fy: 0.10 + Math.random() * 0.20,
      ax: 16 + Math.random() * 44,
      ay: 14 + Math.random() * 36,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      pr: Math.random() * Math.PI * 2,
      base: 0.24,                        // visible against the light background
      amp: 0.12,
      color: palette[i % palette.length],
    }));
  }, [W, H, palette]);
  return <>{orbs.map((s, i) => <Bokeh key={`bo${i}`} clock={clock} s={s} />)}</>;
}

interface SeedDust { baseX: number; baseY: number; fx: number; fy: number; ax: number; ay: number; px: number; py: number; blink: number; pb: number; r: number }

// A soft grey dust mote — small, faint, slowly drifting. Understated for the
// minimal Grayscale theme.
function Dust({ clock, s, color }: { clock: SharedValue<number>; s: SeedDust; color: string }) {
  const cx = useDerivedValue(() => { 'worklet'; return s.baseX + Math.sin(clock.value / 1000 * s.fx + s.px) * s.ax; });
  const cy = useDerivedValue(() => { 'worklet'; return s.baseY + Math.cos(clock.value / 1000 * s.fy + s.py) * s.ay; });
  const opacity = useDerivedValue(() => { 'worklet'; return 0.08 + 0.16 * (0.5 + 0.5 * Math.sin(clock.value / 1000 * s.blink + s.pb)); });
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={s.r} color={color}>
        <BlurMask blur={s.r * 1.2} style="normal" />
      </Circle>
    </Group>
  );
}

function GrayscaleAmbient({ clock, W, H, particle }: { clock: SharedValue<number>; W: number; H: number; particle: string }) {
  const motes = useMemo<SeedDust[]>(() => {
    const n = LOW ? 8 : 14;
    return Array.from({ length: n }, () => ({
      baseX: Math.random() * W,
      baseY: Math.random() * H,
      fx: 0.15 + Math.random() * 0.35,
      fy: 0.12 + Math.random() * 0.30,
      ax: 14 + Math.random() * 36,
      ay: 12 + Math.random() * 30,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      blink: 0.5 + Math.random() * 1.2,
      pb: Math.random() * Math.PI * 2,
      r: 1.4 + Math.random() * 2.6,
    }));
  }, [W, H]);
  return <>{motes.map((s, i) => <Dust key={`d${i}`} clock={clock} s={s} color={particle} />)}</>;
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
      {a.background === 'pastel' && (
        <>
          {/* soft multi-colour pools for a cool baby-pastel wash — pink,
              purple, blue, coral, peach (no yellow) */}
          <GlowBlob x={W * 0.18} y={H * 0.14} r={W * 0.50} color="#F7BCD2" opacity={0.24} />
          <GlowBlob x={W * 0.86} y={H * 0.20} r={W * 0.46} color="#C7A8EA" opacity={0.22} />
          <GlowBlob x={W * 0.10} y={H * 0.56} r={W * 0.44} color="#AEC6EE" opacity={0.20} />
          <GlowBlob x={W * 0.30} y={H * 0.90} r={W * 0.52} color="#F3A9A6" opacity={0.20} />
          <GlowBlob x={W * 0.88} y={H * 0.84} r={W * 0.50} color="#F5C4A6" opacity={0.18} />
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
  const { performanceMode } = useAnimation();
  const { width, height } = useWindowDimensions();
  const a = ATMOSPHERE[themeId];
  // Keep the (cheap, static) gradient, but drop the animated particle layers +
  // per-frame loop in performance mode.
  const ambientOn = showAmbient && !performanceMode;

  const clock = useSharedValue(0);
  // Start inactive; only spin the per-frame worklet when this instance actually
  // shows moving ambient (plain themes, the game screen, and perf mode pay nothing).
  const frame = useFrameCallback((info) => { 'worklet'; clock.value = info.timeSinceFirstFrame ?? 0; }, false);
  useEffect(() => { frame.setActive(!!a && ambientOn); }, [a, ambientOn, frame]);

  if (!a) return null;

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Background a={a} W={width} H={height} />
      {ambientOn && a.background === 'forest' && (
        <ForestAmbient clock={clock} W={width} H={height} particle={a.particle} />
      )}
      {ambientOn && a.background === 'ocean' && (
        <OceanAmbient clock={clock} W={width} H={height} particle={a.particle} />
      )}
      {ambientOn && a.background === 'neon' && (
        <NeonAmbient clock={clock} W={width} H={height} />
      )}
      {ambientOn && a.background === 'pastel' && (
        <PastelAmbient clock={clock} W={width} H={height} palette={a.palette ?? [a.particle]} />
      )}
      {ambientOn && a.background === 'grayscale' && (
        <GrayscaleAmbient clock={clock} W={width} H={height} particle={a.particle} />
      )}
    </Canvas>
  );
}
