import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useSound, SoundPackMeta, SOUND_PACK_IDS } from '@/contexts/SoundContext';
import { makeSettingsStyles, PickerRow, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function SoundPackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { hasCustomization } = usePremium();
  const { soundPack, setSoundPack, play } = useSound();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  // Every preview schedules a batch of timers (chimes, paywall, revert).
  // They're all tracked so a new tap or leaving the screen cancels the
  // whole batch — overlapping batches from rapid taps used to fire stale
  // reverts (landing on a LOCKED pack) and pop the paywall after unmount.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previewPendingRef = useRef(false);
  const revertPackRef = useRef(soundPack);
  const hasCustomizationRef = useRef(hasCustomization);
  hasCustomizationRef.current = hasCustomization;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Leaving mid-preview: cancel everything and put the user's owned pack
  // back — otherwise the locked pack stays selected and persisted.
  useEffect(() => {
    return () => {
      clearTimers();
      if (previewPendingRef.current && !hasCustomizationRef.current) {
        setSoundPack(revertPackRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleIds = SOUND_PACK_IDS.filter(id => !SoundPackMeta[id].hidden);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Sound Effects" colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {visibleIds.map((id, i) => {
              const locked = id !== 'topside' && !hasCustomization;
              return (
                <PickerRow
                  key={id}
                  label={SoundPackMeta[id].label}
                  selected={soundPack === id}
                  locked={locked}
                  onSelect={async () => {
                    clearTimers();
                    if (locked) {
                      // Capture the revert target only when STARTING a
                      // preview — a second locked tap mid-preview must
                      // keep pointing at the owned pack, not the first
                      // locked one.
                      if (!previewPendingRef.current) {
                        revertPackRef.current = soundPack;
                        previewPendingRef.current = true;
                      }
                      await setSoundPack(id);
                      play('merge1');
                      timersRef.current.push(setTimeout(() => play('merge2'), 300));
                      timersRef.current.push(setTimeout(() => play('merge3'), 600));
                      timersRef.current.push(setTimeout(() => setPremiumModalOpen(true), 750));
                      timersRef.current.push(setTimeout(() => {
                        previewPendingRef.current = false;
                        setSoundPack(revertPackRef.current);
                      }, 1650));
                      return;
                    }
                    // Picking an owned pack resolves any pending preview —
                    // this IS the new owned selection.
                    previewPendingRef.current = false;
                    await setSoundPack(id);
                    play('merge1');
                    timersRef.current.push(setTimeout(() => play('merge2'), 300));
                    timersRef.current.push(setTimeout(() => play('merge3'), 600));
                  }}
                  icon="musical-notes"
                  bare
                  compact
                  isLast={i === visibleIds.length - 1}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      <PremiumModal
        visible={premiumModalOpen}
        onClose={() => {
          setPremiumModalOpen(false);
          // Resolve any still-pending preview on close: cancel the queued
          // revert timer either way (a purchase mid-preview must KEEP the
          // previewed pack, not have the timer snatch it back), and revert
          // only if they didn't buy.
          if (previewPendingRef.current) {
            clearTimers();
            previewPendingRef.current = false;
            if (!hasCustomization) setSoundPack(revertPackRef.current);
          }
        }}
      />
    </View>
  );
}
