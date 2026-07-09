import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useMusic } from '@/contexts/MusicContext';
import { useDiceStyle } from '@/contexts/DiceStyleContext';
import { useSound } from '@/contexts/SoundContext';
import { useAnimation } from '@/contexts/AnimationContext';
import { ThemeId, THEME_IDS, ThemeMeta, Themes } from '@/constants/theme';
import { THEME_PRESETS } from '@/constants/themePresets';
import { makeSettingsStyles, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

const FREE_THEMES: ThemeId[] = ['dicedrop', 'dice', 'light', 'dark'];

export default function ThemeScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { hasCustomization } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  const { soundtrackId, setSoundtrack, restartMusicFromTop } = useMusic();
  const { diceStyle, setDiceStyle } = useDiceStyle();
  const { soundPack, setSoundPack } = useSound();
  const { animPack, setAnimPack } = useAnimation();

  // "Complete the look" for the currently-selected theme: one tap sets the
  // mapped soundtrack / dice style / sound effects / dice animations. Only
  // shown for themes that have a preset; unset fields are left alone.
  const preset = THEME_PRESETS[themeId];
  const matched = !!preset
    && (!preset.soundtrack || preset.soundtrack === soundtrackId)
    && (!preset.diceStyle  || preset.diceStyle  === diceStyle)
    && (!preset.soundPack  || preset.soundPack  === soundPack)
    && (!preset.animPack   || preset.animPack   === animPack);

  const applyPreset = () => {
    if (!preset) return;
    if (!hasCustomization) { setPremiumModalOpen(true); return; }
    if (preset.soundtrack) {
      // Restart even when it's already the current track, so "Match" always
      // gives a fresh start (setSoundtrack no-ops on the same id).
      if (preset.soundtrack === soundtrackId) restartMusicFromTop();
      else setSoundtrack(preset.soundtrack);
    }
    if (preset.diceStyle)  setDiceStyle(preset.diceStyle);
    if (preset.soundPack)  void setSoundPack(preset.soundPack);
    if (preset.animPack)   setAnimPack(preset.animPack);
  };

  const selectedMeta = ThemeMeta[themeId];

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Theme" colors={colors} />

      {preset && (
        <TouchableOpacity
          activeOpacity={matched ? 1 : 0.85}
          disabled={matched}
          onPress={applyPreset}
          style={bannerStyles.card}
        >
          <View style={bannerStyles.textCol}>
            <Text style={[bannerStyles.title, { color: colors.text }]} numberOfLines={1}>
              {matched ? `Matched to ${selectedMeta.label}` : `Complete the ${selectedMeta.label} look`}
            </Text>
            <Text style={[bannerStyles.sub, { color: colors.textSecondary }]} numberOfLines={2}>
              {matched
                ? 'Sounds, dice & effects all match'
                : 'Set the sounds, dice & effects to match'}
            </Text>
          </View>
          {matched
            ? <Ionicons name="checkmark-circle" size={26} color={colors.accent} />
            : (
              <View style={[bannerStyles.applyBtn, { backgroundColor: colors.accent }]}>
                <Text style={[bannerStyles.applyText, { color: colors.accentText }]}>Apply</Text>
              </View>
            )
          }
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={[styles.content, { gap: 10, paddingTop: 10 }]} showsVerticalScrollIndicator={false}>
        {THEME_IDS.map(id => {
          const meta = ThemeMeta[id];
          const theme = Themes[id];
          const selected = themeId === id;
          const locked = !hasCustomization && !FREE_THEMES.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[
                rowStyles.row,
                { backgroundColor: theme.background, borderColor: selected ? theme.accent : theme.border },
                selected && { borderWidth: 2 },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (locked) { setPremiumModalOpen(true); return; }
                setTheme(id);
              }}
            >
              <View style={[rowStyles.dot, { backgroundColor: theme.accent }]} />
              <Text style={[rowStyles.label, { color: theme.text }]} numberOfLines={1}>{meta.label}</Text>
              {locked
                ? <Ionicons name="lock-closed" size={18} color={theme.accent} />
                : selected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
              }
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 10, marginBottom: 0, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, fontWeight: '500' },
  applyBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  applyText: { fontSize: 14, fontWeight: '700' },
});

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 14 },
  dot:   { width: 26, height: 26, borderRadius: 13 },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
});
