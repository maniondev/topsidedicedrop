import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useAnimation, AnimPackMeta, ANIM_PACK_IDS, AnimPackId } from '@/contexts/AnimationContext';
import { makeSettingsStyles, PackCard, AnimatedDie } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function AnimationPackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const { animPack, setAnimPack } = useAnimation();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const dieRefs = useRef<Partial<Record<AnimPackId, { play: () => void }>>>({});

  return (
    <View style={[styles.safe]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
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
                      if (locked) { setPremiumModalOpen(true); return; }
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
          </View>
        </View>
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
