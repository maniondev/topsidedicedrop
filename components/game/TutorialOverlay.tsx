import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View, LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalizedFont } from '@/lib/fonts';
import { IS_LARGE } from '@/lib/breakpoints';

// Page 1: controls. Page 2: the objective — same 3-row structure so the card
// keeps the same height and the button stays in the same place (an exact
// height lock below guarantees it even if a translation wraps differently).
const CONTROL_HINTS = [
  { icon: '← →', key: 'game.tutorial.move' },
  { icon: '↻',   key: 'game.tutorial.rotate' },
  { icon: '↓',   key: 'game.tutorial.drop' },
  { icon: '↑',   key: 'game.tutorial.pause' },
];
const OBJECTIVE_HINTS = [
  { icon: '⚁⚁', key: 'game.tutorial.objMerge' },
  { icon: '⚅',  key: 'game.tutorial.objSixes' },
  { icon: '▦',  key: 'game.tutorial.objSurvive' },
];

interface Props {
  onDismiss: () => void;
}

export default function TutorialOverlay({ onDismiss }: Props) {
  const { t } = useTranslation();
  const font = useLocalizedFont();
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState<0 | 1>(0);
  // Natural heights of BOTH pages' rows, measured via invisible copies below.
  // The visible container is locked to the max of the two, so the card (and
  // therefore the button position/size) cannot shift between pages AND
  // neither page can overflow — on tablets the larger fonts make some
  // translations wrap to more lines on page 2 than page 1, so locking to
  // page 1's height alone would clip/overflow them.
  const [h1, setH1] = useState<number | null>(null);
  const [h2, setH2] = useState<number | null>(null);
  const lockH = h1 != null && h2 != null ? Math.max(h1, h2) : null;

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDismiss());
  }, [onDismiss]);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const onMeasure1 = useCallback((e: LayoutChangeEvent) => setH1(e.nativeEvent.layout.height), []);
  const onMeasure2 = useCallback((e: LayoutChangeEvent) => setH2(e.nativeEvent.layout.height), []);

  const hints = page === 0 ? CONTROL_HINTS : OBJECTIVE_HINTS;

  // Single row renderer shared by the visible page AND both measurers — the
  // height lock is only correct if measurer rows lay out identically to the
  // visible ones, so the markup must exist exactly once. `colored` is the only
  // difference (measurers are invisible; color never affects layout).
  const renderRows = (hs: typeof CONTROL_HINTS, colored: boolean) =>
    hs.map((h, i) => (
      <View key={h.key} style={[styles.row, i < hs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colored ? colors.border : 'transparent' }]}>
        <Text style={[styles.icon, colored && { color: colors.accent }]}>{h.icon}</Text>
        <Text style={[styles.label, colored && { color: colors.text }]}>{t(h.key)}</Text>
      </View>
    ));

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Invisible measurers: both pages rendered at the real content
              width so lockH reflects true wrapped heights in every locale. */}
          <View style={styles.measurer} pointerEvents="none" onLayout={onMeasure1}>
            {renderRows(CONTROL_HINTS, false)}
          </View>
          <View style={styles.measurer} pointerEvents="none" onLayout={onMeasure2}>
            {renderRows(OBJECTIVE_HINTS, false)}
          </View>
          <View style={lockH != null ? { height: lockH, justifyContent: 'center' } : undefined}>
            {renderRows(hints, true)}
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={page === 0 ? () => setPage(1) : dismiss}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, { color: colors.accentText, fontFamily: font('Rubik_700Bold') }]}>
              {page === 0 ? t('game.tutorial.next') : t('game.tutorial.letsGo')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 40 },
  card:     { borderRadius: 16, borderWidth: 1, paddingTop: 8, paddingBottom: IS_LARGE ? 22 : 16, paddingHorizontal: IS_LARGE ? 32 : 24, width: '100%', maxWidth: IS_LARGE ? 460 : 440 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: IS_LARGE ? 20 : 14, gap: IS_LARGE ? 20 : 14, minHeight: IS_LARGE ? 92 : 70 },
  icon:     { fontSize: IS_LARGE ? 30 : 22, width: IS_LARGE ? 44 : 32, textAlign: 'center' },
  label:    { fontSize: IS_LARGE ? 21 : 15, flex: 1, flexWrap: 'wrap' },
  btn:      { marginTop: IS_LARGE ? 18 : 12, borderRadius: IS_LARGE ? 14 : 10, paddingVertical: IS_LARGE ? 22 : 16, alignItems: 'center' },
  // fontFamily deliberately absent — the render applies font('Rubik_700Bold')
  // inline so CJK locales fall back to the system font.
  btnText:  { fontSize: IS_LARGE ? 22 : 16 },
  // Same content width as the visible rows (absolute children sit inside the
  // card's padding box), zero visual/interaction footprint.
  measurer: { position: 'absolute', left: 0, right: 0, opacity: 0 },
});
