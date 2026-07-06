import React, { useMemo, useState, useRef } from 'react';
import { View, ScrollView, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useMusic, SoundtrackMeta, SOUNDTRACK_IDS, SoundtrackId } from '@/contexts/MusicContext';
import { makeSettingsStyles, PickerRow, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';
import { COMPOSER_NAME, openComposerIG } from '@/lib/composer';

const FREE_SOUNDTRACK: SoundtrackId = 'dicedrop';
// Long enough to hear a few bars of the preview before the paywall appears.
const PREVIEW_MODAL_DELAY_MS = 2500;

export default function SoundtrackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const { soundtrackId, setSoundtrack } = useMusic();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revertToSelection = useRef(soundtrackId);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Soundtrack" colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {SOUNDTRACK_IDS.map((id, i) => {
              const locked = id !== FREE_SOUNDTRACK && !isPremium;
              return (
                <PickerRow
                  key={id}
                  label={SoundtrackMeta[id].label}
                  selected={soundtrackId === id}
                  locked={locked}
                  onSelect={() => {
                    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
                    if (locked) {
                      // Preview: play the locked track briefly, then open the
                      // paywall. Reverting happens on modal close, not on a
                      // fixed timer, so the preview keeps playing while the
                      // user is looking at the offer.
                      revertToSelection.current = soundtrackId;
                      setSoundtrack(id);
                      previewTimerRef.current = setTimeout(() => setPremiumModalOpen(true), PREVIEW_MODAL_DELAY_MS);
                      return;
                    }
                    setSoundtrack(id);
                  }}
                  icon="musical-notes"
                  bare
                  compact
                  isLast={i === SOUNDTRACK_IDS.length - 1}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={openComposerIG}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingTop: 4 }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
            Audio Composer: <Text style={{ color: colors.accent }}>{COMPOSER_NAME}</Text>
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.accent} />
        </Pressable>
      </ScrollView>
      <PremiumModal
        visible={premiumModalOpen}
        onClose={() => {
          setPremiumModalOpen(false);
          // Only revert if they didn't just buy premium — a purchase
          // mid-preview should keep their new pick.
          if (!isPremium) setSoundtrack(revertToSelection.current);
        }}
      />
    </View>
  );
}
