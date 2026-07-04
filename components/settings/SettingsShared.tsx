import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Canvas, RoundedRect, Circle, Rect, Group, BlurMask, RadialGradient, vec, rrect, rect } from '@shopify/react-native-skia';
import { ThemeColors, ThemeId, ThemeMeta, Themes } from '@/constants/theme';
import { AnimPackId } from '@/contexts/AnimationContext';
import { DiceStyleId } from '@/contexts/DiceStyleContext';

export const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;

export function Section({ label, children, styles }: {
  label: string; children: React.ReactNode;
  styles: ReturnType<typeof makeSettingsStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export function RowItem({ label, value, onPress, danger, colors, styles }: {
  label: string; value?: string; onPress?: () => void; danger?: boolean;
  colors: ThemeColors; styles: ReturnType<typeof makeSettingsStyles>;
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

export function ToggleRow({ label, sublabel, value, onValueChange, colors, styles }: {
  label: string; sublabel?: string; value: boolean; onValueChange: (v: boolean) => void;
  colors: ThemeColors; styles: ReturnType<typeof makeSettingsStyles>;
}) {
  return (
    <View style={styles.row}>
      {sublabel ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{sublabel}</Text>
        </View>
      ) : (
        <Text style={styles.rowLabel}>{label}</Text>
      )}
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

export function PickerRow({ label, selected, locked, onSelect, icon, preview, swatchColor, isLast, colors, styles }: {
  label: string; selected: boolean; locked: boolean; onSelect: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  preview?: React.ReactNode;
  swatchColor?: string; // background color for the thumbnail box (theme rows)
  isLast?: boolean;
  colors: ThemeColors; styles: ReturnType<typeof makeSettingsStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.pickerRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.pickerRowThumb, { backgroundColor: swatchColor ?? colors.card, borderColor: colors.cardBorder }]}>
        {preview ?? (icon && <Ionicons name={icon} size={22} color={selected ? colors.accent : colors.textSecondary} />)}
      </View>
      <Text style={[styles.rowLabel, { marginLeft: 12 }]} numberOfLines={1}>{label}</Text>
      {locked
        ? <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
        : selected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
      }
    </TouchableOpacity>
  );
}

export function ThemeCard({ id, selected, locked, onSelect, colors, styles }: {
  id: ThemeId; selected: boolean; locked: boolean; onSelect: () => void;
  colors: ThemeColors; styles: ReturnType<typeof makeSettingsStyles>;
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

export function PackCard({ label, description, selected, locked, comingSoon, onSelect, icon, preview, colors, styles }: {
  label: string; description?: string; selected: boolean; locked: boolean;
  comingSoon?: boolean; onSelect: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  preview?: React.ReactNode;
  colors: ThemeColors; styles: ReturnType<typeof makeSettingsStyles>;
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

const PREVIEW_RED = '#D92B2B';
const PREVIEW_DOT = '#ffffff';

export function DiceStylePreview({ styleId }: { styleId: DiceStyleId }) {
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

export const AnimatedDie = forwardRef(function AnimatedDie(
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

export function makeSettingsStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: c.background },
    content:        { paddingHorizontal: 20, paddingTop: 16 },

    screenTitle: {
      fontSize: IS_LARGE ? 36 : 28,
      fontWeight: '800',
      color: c.titleColor ?? c.text,
      letterSpacing: -0.5,
      marginBottom: 24,
    },

    section:      { marginBottom: 24 },
    sectionLabel: {
      fontSize: IS_LARGE ? 15 : 12,
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
      fontSize: IS_LARGE ? 24 : 20,
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
      paddingVertical: IS_LARGE ? 18 : 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: IS_LARGE ? 18 : 15,
      color: c.text,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: IS_LARGE ? 17 : 14,
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
      fontSize: IS_LARGE ? 18 : 15,
      fontWeight: '700',
    },
    premiumSub: {
      fontSize: IS_LARGE ? 15 : 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    upgradeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: IS_LARGE ? 16 : 11,
      paddingHorizontal: 20,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      justifyContent: 'center',
    },
    upgradeBtnText: {
      fontSize: IS_LARGE ? 17 : 13,
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
      fontSize: IS_LARGE ? 14 : 11,
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
      fontSize: IS_LARGE ? 14 : 12,
      fontWeight: '700',
    },
    packCardDesc: {
      fontSize: IS_LARGE ? 12 : 10,
      lineHeight: IS_LARGE ? 16 : 13,
    },

    // Row-based picker (theme / sound pack / animation pack / dice style / app icon)
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: IS_LARGE ? 14 : 12,
    },
    pickerRowThumb: {
      width: IS_LARGE ? 56 : 48,
      height: IS_LARGE ? 56 : 48,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
  });
}
