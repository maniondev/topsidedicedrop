import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useSound, SoundPackMeta, SOUND_PACK_IDS } from '@/contexts/SoundContext';
import { makeSettingsStyles, PackCard } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function SoundPackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const { soundPack, setSoundPack, play } = useSound();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
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
                        setTimeout(() => setPremiumModalOpen(true), 900);
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
          </View>
        </View>
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
