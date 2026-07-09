import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useMusic, SoundtrackMeta, SOUNDTRACK_IDS, SoundtrackId } from '@/contexts/MusicContext';
import { makeSettingsStyles, PickerRow, SettingsSubHeader, IS_LARGE } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';
import { COMPOSER_NAME, openComposerIG } from '@/lib/composer';

const FREE_SOUNDTRACK: SoundtrackId = 'dicedrop';
// Long enough to hear a few bars of the preview before the paywall appears.
const PREVIEW_MODAL_DELAY_MS = 2500;

export default function SoundtrackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { hasCustomization } = usePremium();
  const { soundtrackId, setSoundtrack, previewSoundtrack } = useMusic();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True from the moment a locked preview starts until it's resolved
  // (paywall closed / purchase / revert). While pending, the revert target
  // is NOT recaptured — tapping a second locked row mid-preview must keep
  // pointing back at the user's actual owned selection, not the first
  // locked track.
  const previewPendingRef = useRef(false);
  const revertToSelection = useRef(soundtrackId);
  // Mirrors for the unmount cleanup closure.
  const hasCustomizationRef = useRef(hasCustomization);
  hasCustomizationRef.current = hasCustomization;

  // Leaving the screen mid-preview must revert — otherwise a locked track
  // stays selected, playing, and persisted without payment (the paywall
  // timer would fire on an unmounted screen and the modal-close revert
  // would never run).
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      if (previewPendingRef.current && !hasCustomizationRef.current) {
        setSoundtrack(revertToSelection.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Soundtrack" colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {SOUNDTRACK_IDS.map((id, i) => {
              const locked = id !== FREE_SOUNDTRACK && !hasCustomization;
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
                      // paywall. Reverting happens on modal close (or screen
                      // exit), not on a fixed timer, so the preview keeps
                      // playing while the user is looking at the offer.
                      if (!previewPendingRef.current) {
                        revertToSelection.current = soundtrackId;
                        previewPendingRef.current = true;
                      }
                      previewSoundtrack(id);
                      previewTimerRef.current = setTimeout(() => setPremiumModalOpen(true), PREVIEW_MODAL_DELAY_MS);
                      return;
                    }
                    // Picking an owned track resolves any pending preview —
                    // this IS the new owned selection.
                    previewPendingRef.current = false;
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
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 12 }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: IS_LARGE ? 16 : 13, fontWeight: '600', textAlign: 'center' }}>
            Audio Composer: <Text style={{ color: colors.accent }}>{COMPOSER_NAME}</Text>
          </Text>
          <Ionicons name="open-outline" size={IS_LARGE ? 17 : 14} color={colors.accent} />
        </Pressable>
      </ScrollView>
      <PremiumModal
        visible={premiumModalOpen}
        onClose={() => {
          setPremiumModalOpen(false);
          previewPendingRef.current = false;
          // Only revert if they didn't just buy premium — a purchase
          // mid-preview should keep their new pick.
          if (!hasCustomization) setSoundtrack(revertToSelection.current);
        }}
        intent="customization"
      />
    </View>
  );
}
