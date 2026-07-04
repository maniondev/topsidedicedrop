import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useAnimation, AnimPackMeta, ANIM_PACK_IDS, AnimPackId } from '@/contexts/AnimationContext';
import { makeSettingsStyles, PickerRow, AnimatedDie } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function AnimationPackScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const { animPack, setAnimPack } = useAnimation();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const dieRefs = useRef<Partial<Record<AnimPackId, { play: () => void }>>>({});

  const visibleIds = ANIM_PACK_IDS.filter(id => !AnimPackMeta[id].hidden);

  return (
    <View style={[styles.safe]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {visibleIds.map((id, i) => {
              const meta = AnimPackMeta[id];
              const locked = !meta.free && !isPremium;
              return (
                <PickerRow
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
                  isLast={i === visibleIds.length - 1}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
