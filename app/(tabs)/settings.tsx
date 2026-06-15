import React, { useMemo, useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Linking,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Canvas, RoundedRect, Circle, Rect, Group, BlurMask, Line, RadialGradient, vec, rrect, rect } from '@shopify/react-native-skia';
import { useTheme, useDieColors } from '@/contexts/ThemeContext';
import { useSound, SoundPackMeta, SOUND_PACK_IDS, SoundPackId } from '@/contexts/SoundContext';
import { useAnimation, AnimPackMeta, ANIM_PACK_IDS, AnimPackId } from '@/contexts/AnimationContext';
import { useDiceStyle, DiceStyleMeta, DICE_STYLE_IDS, DiceStyleId } from '@/contexts/DiceStyleContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useStats } from '@/contexts/StatsContext';
import { loadStats, saveStats } from '@/lib/storage';
import { submitScoreForCurrentPlayer } from '@/lib/scoreQueue';
import PremiumModal from '@/components/PremiumModal';
import { ThemeColors, ThemeId, ThemeMeta, THEME_IDS, Themes } from '@/constants/theme';
import { openNativeReview } from '@/lib/reviewPrompt';

const FREE_THEMES: ThemeId[] = ['dice', 'light', 'dark'];

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { soundEnabled, setSoundEnabled, soundPack, setSoundPack, play } = useSound();
  const { animPack, setAnimPack } = useAnimation();
  const { diceStyle, setDiceStyle } = useDiceStyle();
  const { isPremium, upgrade, restorePurchases, devToggle } = usePremium();
  const { resetStats, refresh } = useStats();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const dieRefs = useRef<Partial<Record<AnimPackId, { play: () => void }>>>({});

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const handleUpgrade = () => setPremiumModalOpen(true);

  const boostStatsForScreenshots = async () => {
    const stats = await loadStats();
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Set medium best scores
    stats.byDifficulty.medium.bestScore = 12294;
    stats.byDifficulty.medium.bestUnassisted = 4174;
    stats.byDifficulty.medium.totalRuns = Math.max(stats.byDifficulty.medium.totalRuns, 47);
    stats.byDifficulty.medium.lifetimeScore = Math.max(stats.byDifficulty.medium.lifetimeScore, 189430);
    // Inject 17 consecutive daily runs (one per day) for streak
    const existingDays = new Set(stats.recentRuns.map(r => {
      const d = new Date(r.date); d.setHours(0, 0, 0, 0); return d.getTime();
    }));
    const fakeRuns = [];
    for (let i = 0; i < 17; i++) {
      const day = today.getTime() - i * DAY;
      if (!existingDays.has(day)) {
        fakeRuns.push({ score: Math.floor(800 + Math.random() * 3000), date: day + 10 * 60 * 1000, bestChain: Math.floor(1 + Math.random() * 5), difficulty: 'medium' as const, usedContinue: false });
      }
    }
    stats.recentRuns = [...fakeRuns, ...stats.recentRuns].slice(0, 100);
    await saveStats(stats);
    await refresh();
    await submitScoreForCurrentPlayer({ p_score: 12294, p_best_chain: 9, p_difficulty: 'medium', p_used_continue: false });
    Alert.alert('Done', 'Stats boosted for screenshots!');
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset Stats?',
      'This permanently erases your local stats and removes your scores from the global leaderboard. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await resetStats();
          Alert.alert('Stats Reset', 'Your stats have been cleared.');
        }},
      ],
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: top }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>Settings</Text>

        {/* Premium */}
        <Section label="Premium" styles={styles}>
          {isPremium ? (
            <View style={styles.premiumActive}>
              <Ionicons name="star" size={20} color={colors.premiumGold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>Premium Active</Text>
                <Text style={styles.premiumSub}>No ads · 1 free continue/run · All themes, sounds, animations & dice styles</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.premiumGold }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={[styles.upgradeBtnText, { color: '#fff' }]}>Unlock Premium</Text>
            </TouchableOpacity>
          )}
          {!isPremium && (
            <RowItem label="Restore Purchases" onPress={restorePurchases} colors={colors} styles={styles} />
          )}
          {__DEV__ && (
            <RowItem
              label="⚙️ Dev: Boost Stats (screenshots)"
              onPress={boostStatsForScreenshots}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && (
            <RowItem
              label={isPremium ? '⚙️ Dev: Remove Premium' : '⚙️ Dev: Enable Premium'}
              onPress={devToggle}
              danger={isPremium}
              colors={colors}
              styles={styles}
            />
          )}
        </Section>

        {/* ── Customize ── */}
        <View style={styles.customizeHeader}>
          <Text style={styles.customizeTitle}>Customize</Text>
          {!isPremium && (
            <TouchableOpacity onPress={handleUpgrade} style={[styles.premiumPill, { backgroundColor: colors.premiumGold }]}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.premiumPillText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Customize — single card */}
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>

            {/* Theme */}
            <Text style={styles.innerSectionLabel}>Theme</Text>
            <View style={styles.themeGrid}>
              {THEME_IDS.map(id => (
                <ThemeCard
                  key={id}
                  id={id}
                  selected={themeId === id}
                  locked={!isPremium && !FREE_THEMES.includes(id)}
                  onSelect={() => {
                    if (!isPremium && !FREE_THEMES.includes(id)) { handleUpgrade(); return; }
                    setTheme(id);
                  }}
                  colors={colors}
                  styles={styles}
                />
              ))}
            </View>

            <View style={[styles.innerSep, { backgroundColor: colors.separator }]} />

            {/* Sound Pack */}
            <Text style={styles.innerSectionLabel}>Sound Pack</Text>
            <View style={styles.packGrid}>
              {SOUND_PACK_IDS.filter(id => !SoundPackMeta[id].hidden).map(id => {
                const locked = id !== 'topside' && !isPremium;
                return (
                  <PackCard
                    key={id}
                    label={SoundPackMeta[id].label}
                    selected={soundPack === id}
                    locked={locked}
                    onSelect={() => {
                      if (locked) {
                        setSoundPack(id);
                        setTimeout(() => play('merge1'), 150);
                        setTimeout(() => play('merge2'), 450);
                        setTimeout(() => play('merge3'), 750);
                        setTimeout(() => handleUpgrade(), 900);
                        setTimeout(() => setSoundPack(soundPack), 1800);
                        return;
                      }
                      setSoundPack(id);
                      setTimeout(() => play('merge1'), 150);
                      setTimeout(() => play('merge2'), 450);
                      setTimeout(() => play('merge3'), 750);
                    }}
                    icon="musical-notes"
                    colors={colors}
                    styles={styles}
                  />
                );
              })}
            </View>

            <View style={[styles.innerSep, { backgroundColor: colors.separator }]} />

            {/* Animation Pack */}
            <Text style={styles.innerSectionLabel}>Animation Pack</Text>
            <View style={styles.packGrid}>
              {ANIM_PACK_IDS.filter(id => !AnimPackMeta[id].hidden).map(id => {
                const meta = AnimPackMeta[id];
                const locked = !meta.free && !isPremium;
                return (
                  <PackCard
                    key={id}
                    label={meta.label}
                    selected={animPack === id}
                    locked={locked}
                    onSelect={() => {
                      dieRefs.current[id]?.play();
                      if (locked) { handleUpgrade(); return; }
                      setAnimPack(id);
                    }}
                    preview={
                      <AnimatedDie
                        ref={handle => { dieRefs.current[id] = handle ?? undefined; }}
                        packId={id}
                        color={animPack === id ? colors.accent : colors.textSecondary}
                      />
                    }
                    colors={colors}
                    styles={styles}
                  />
                );
              })}
            </View>

            <View style={[styles.innerSep, { backgroundColor: colors.separator }]} />

            {/* Dice Style */}
            <Text style={styles.innerSectionLabel}>Dice Style</Text>
            <View style={styles.packGrid}>
              {DICE_STYLE_IDS.map(id => {
                const meta = DiceStyleMeta[id];
                const locked = !meta.free && !isPremium;
                return (
                  <PackCard
                    key={id}
                    label={meta.label}
                    selected={diceStyle === id}
                    locked={locked}
                    onSelect={() => {
                      if (locked) { handleUpgrade(); return; }
                      setDiceStyle(id);
                    }}
                    preview={
                      <DiceStylePreview styleId={id} />
                    }
                    colors={colors}
                    styles={styles}
                  />
                );
              })}
            </View>

          </View>
        </View>

        {/* Sound toggle */}
        <Section label="Sound" styles={styles}>
          <ToggleRow
            label="Sound Effects"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            colors={colors}
            styles={styles}
          />
        </Section>

        {/* Stats */}
        <Section label="Stats" styles={styles}>
          <RowItem label="Reset Stats" onPress={confirmReset} danger colors={colors} styles={styles} />
        </Section>

        {/* About */}
        <Section label="About" styles={styles}>
          <RowItem label="Rate Topside: Dice Drop ★" colors={colors} styles={styles} onPress={openNativeReview} />
          <RowItem label="More Games by Topside" colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games')} />
          <RowItem label="Privacy Policy" colors={colors} styles={styles} onPress={() => Linking.openURL('https://sites.google.com/view/topsideapp/home')} />
          <RowItem label="Version" value={Constants.expoConfig?.version ?? '—'} colors={colors} styles={styles} />
        </Section>

        <View style={{ height: 8 }} />
      </ScrollView>

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PREVIEW_RED = '#D92B2B';
const PREVIEW_DOT = '#ffffff';
const PIP_CENTER: [number, number] = [0.50, 0.50];

function DiceStylePreview({ styleId }: { styleId: DiceStyleId }) {
  const cs = 20;
  const pad = 1.5;
  const rw = cs - pad * 2;
  const rx = pad, ry = pad;
  const cx = rx + rw / 2, cy = ry + rw / 2;
  const dotR = Math.max(cs * 0.13, 3.5);
  const pipSize = Math.max(cs * 0.22, 5);
  const fc = PREVIEW_RED;
  const dc = PREVIEW_DOT;

  return (
    <Canvas style={{ width: cs, height: cs }}>
      {styleId === 'classic' && (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={6} color={fc} />
          <Circle cx={cx} cy={cy} r={dotR} color={dc} />
        </>
      )}
      {styleId === 'sketch' && (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={6} color={fc} style="stroke" strokeWidth={2.8} />
          <Circle cx={cx} cy={cy} r={Math.max(cs * 0.13, 3.5)} color={fc} style="stroke" strokeWidth={2} />
        </>
      )}
      {styleId === 'round' && (
        <>
          <Circle cx={cx} cy={cy} r={rw / 2} color={fc} />
          <Circle cx={cx} cy={cy} r={dotR * 0.92} color={dc} />
        </>
      )}
      {styleId === 'pixel' && (
        <>
          <Rect x={rx} y={ry} width={rw} height={rw} color={fc} />
          <Rect x={rx} y={ry} width={rw} height={1.5} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry} width={1.5} height={rw} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry + rw - 1.5} width={rw} height={1.5} color="rgba(0,0,0,0.3)" />
          <Rect x={rx + rw - 1.5} y={ry} width={1.5} height={rw} color="rgba(0,0,0,0.3)" />
          <Rect x={cx - pipSize / 2} y={cy - pipSize / 2} width={pipSize} height={pipSize} color={dc} />
        </>
      )}
      {styleId === 'neon' && (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={6} color="rgba(6,3,16,0.93)" />
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={6} color={fc} style="stroke" strokeWidth={2.5}>
            <BlurMask blur={4} style="solid" />
          </RoundedRect>
          <RoundedRect x={rx + 1} y={ry + 1} width={rw - 2} height={rw - 2} r={5} color={fc} style="stroke" strokeWidth={0.8} />
          <Circle cx={cx} cy={cy} r={dotR} color={fc}>
            <BlurMask blur={2.5} style="solid" />
          </Circle>
          <Circle cx={cx} cy={cy} r={dotR * 0.55} color={fc} />
        </>
      )}
      {styleId === 'raised' && (() => {
        const bevel = Math.max(cs * 0.12, 3);
        const clip = rrect(rect(rx, ry, rw, rw), 6, 6);
        return (
          <>
            <Group clip={clip}>
              <Rect x={rx} y={ry} width={rw} height={rw} color={fc} />
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
            <Circle cx={cx + 1} cy={cy + 1} r={dotR} color="rgba(0,0,0,0.35)" />
            <Circle cx={cx} cy={cy} r={dotR} color={dc} />
          </>
        );
      })()}
    </Canvas>
  );
}

function Section({ label, children, styles }: {
  label: string; children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function RowItem({ label, value, onPress, danger, colors, styles }: {
  label: string; value?: string; onPress?: () => void; danger?: boolean;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={danger ? colors.danger : colors.textDim} />
      ) : null}
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onValueChange, colors, styles }: {
  label: string; value: boolean; onValueChange: (v: boolean) => void;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function ThemeCard({ id, selected, locked, onSelect, colors, styles }: {
  id: ThemeId; selected: boolean; locked: boolean; onSelect: () => void;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  const meta = ThemeMeta[id];
  const theme = Themes[id];
  const [bg, card, accent] = meta.swatches;

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { backgroundColor: bg },
        selected && { borderColor: colors.accent },
        locked && { opacity: 0.5 },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={[styles.themeCardInner, { backgroundColor: card }]}>
        <View style={[styles.themeAccentDot, { backgroundColor: accent }]} />
      </View>
      <View style={styles.themeCardLabel}>
        <Text style={[styles.themeCardName, { color: theme.text }]} numberOfLines={1}>
          {meta.label}
        </Text>
        {locked
          ? <Ionicons name="lock-closed" size={12} color={theme.textDim} />
          : selected && <Ionicons name="checkmark-circle" size={12} color={accent} />
        }
      </View>
    </TouchableOpacity>
  );
}

function PackCard({ label, description, selected, locked, comingSoon, onSelect, icon, preview, colors, styles }: {
  label: string; description?: string; selected: boolean; locked: boolean;
  comingSoon?: boolean; onSelect: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  preview?: React.ReactNode;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.packCard,
        { backgroundColor: colors.card, borderColor: selected ? colors.accent : colors.cardBorder },
        (locked || comingSoon) && { opacity: 0.55 },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
      disabled={comingSoon}
    >
      <View style={styles.packCardTop}>
        {preview ?? (icon && <Ionicons name={icon} size={18} color={selected ? colors.accent : colors.textSecondary} />)}
        {locked && !comingSoon && <Ionicons name="lock-closed" size={11} color={colors.textMuted} />}
        {selected && <Ionicons name="checkmark-circle" size={13} color={colors.accent} />}
      </View>
      <Text style={[styles.packCardLabel, { color: selected ? colors.accent : colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {description && (
        <Text style={[styles.packCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const AnimatedDie = forwardRef(function AnimatedDie(
  { packId, color }: { packId: AnimPackId; color: string },
  ref: React.Ref<{ play: () => void }>,
) {
  const scale  = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const rotate = useSharedValue(0);
  const tx     = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${rotate.value}deg` },
      { scaleX: scaleX.value * scale.value },
      { scaleY: scaleY.value * scale.value },
    ],
    opacity: opacity.value,
  }));

  const triggerPreview = () => {
    scale.value = 1; scaleX.value = 1; scaleY.value = 1;
    rotate.value = 0; tx.value = 0; opacity.value = 1;

    switch (packId) {
      case 'classic':
        scale.value = withSequence(
          withTiming(1.25, { duration: 100, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 8, stiffness: 200 }),
        );
        opacity.value = withSequence(
          withTiming(0.5, { duration: 60 }),
          withTiming(1, { duration: 200 }),
        );
        break;
      case 'extra':
        scaleX.value = withSequence(
          withTiming(1.35, { duration: 80 }), withTiming(0.75, { duration: 80 }),
          withSpring(1, { damping: 5, stiffness: 160 }),
        );
        scaleY.value = withSequence(
          withTiming(0.65, { duration: 80 }), withTiming(1.35, { duration: 80 }),
          withSpring(1, { damping: 5, stiffness: 160 }),
        );
        break;
      case 'minimal':
        opacity.value = withSequence(
          withTiming(0.15, { duration: 180, easing: Easing.inOut(Easing.quad) }),
          withTiming(1,    { duration: 320, easing: Easing.inOut(Easing.quad) }),
        );
        scale.value = withSequence(
          withTiming(0.88, { duration: 180 }),
          withTiming(1,    { duration: 320 }),
        );
        break;
      case 'retro':
        scale.value = withSequence(
          withTiming(1.4, { duration: 50, easing: Easing.linear }),
          withTiming(1.0, { duration: 50, easing: Easing.linear }),
          withTiming(1.2, { duration: 50, easing: Easing.linear }),
          withTiming(1.0, { duration: 50, easing: Easing.linear }),
        );
        break;
      case 'electric':
        tx.value = withSequence(
          withTiming(-7, { duration: 35 }), withTiming(7,  { duration: 35 }),
          withTiming(-5, { duration: 35 }), withTiming(5,  { duration: 35 }),
          withTiming(-3, { duration: 35 }), withTiming(0,  { duration: 35 }),
        );
        break;
      case 'twist':
        rotate.value = withTiming(360, { duration: 420, easing: Easing.out(Easing.quad) }, () => {
          'worklet';
          rotate.value = 0;
        });
        break;
      case 'flip':
        scaleY.value = withSequence(
          withTiming(0, { duration: 90, easing: Easing.in(Easing.quad) }),
          withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        );
        scaleX.value = withSequence(
          withTiming(1.1, { duration: 90 }),
          withTiming(1,   { duration: 90 }),
        );
        break;
      case 'shatter':
        scale.value = withSequence(
          withTiming(1.4, { duration: 55, easing: Easing.out(Easing.exp) }),
          withTiming(1,   { duration: 55 }),
        );
        opacity.value = withSequence(
          withTiming(0.2, { duration: 55 }),
          withTiming(1,   { duration: 55 }),
          withTiming(0.6, { duration: 40 }),
          withTiming(1,   { duration: 80 }),
        );
        break;
      case 'glitch':
        tx.value = withSequence(
          withTiming(-5, { duration: 35 }), withTiming(5,  { duration: 35 }),
          withTiming(-4, { duration: 35 }), withTiming(4,  { duration: 35 }),
          withTiming(-2, { duration: 35 }), withTiming(0,  { duration: 35 }),
        );
        opacity.value = withSequence(
          withTiming(0.3, { duration: 50 }),
          withTiming(1,   { duration: 40 }),
          withTiming(0.6, { duration: 40 }),
          withTiming(1,   { duration: 80 }),
        );
        break;
    }
  };

  useImperativeHandle(ref, () => ({ play: triggerPreview }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="dice" size={20} color={color} />
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: c.background },
    content:        { paddingHorizontal: 20, paddingTop: 16 },

    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
      marginBottom: 24,
    },

    section:      { marginBottom: 24 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 8,
      paddingLeft: 4,
    },
    sectionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },

    customizeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      marginTop: 4,
    },
    customizeTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
    },
    premiumPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    premiumPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '600',
    },

    premiumActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
    },
    premiumTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    premiumSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    upgradeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 20,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      justifyContent: 'center',
    },
    upgradeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },

    // Theme picker
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 12,
    },
    themeCard: {
      width: '30%',
      flexGrow: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      paddingBottom: 8,
    },
    themeCardInner: {
      height: 26,
      margin: 6,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeAccentDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    themeCardLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 2,
      gap: 4,
    },
    themeCardName: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },

    innerSectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      paddingTop: 14,
      paddingBottom: 2,
      paddingLeft: 12,
    },
    innerSep: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 12,
      marginTop: 4,
    },

    // Pack picker (sound + animation)
    packGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 12,
    },
    packCard: {
      width: '30%',
      flexGrow: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 10,
      gap: 4,
    },
    packCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    packCardLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    packCardDesc: {
      fontSize: 10,
      lineHeight: 13,
    },
  });
}
