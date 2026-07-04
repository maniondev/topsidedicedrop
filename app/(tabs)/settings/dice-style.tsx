import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useDiceStyle, DiceStyleMeta, DICE_STYLE_IDS } from '@/contexts/DiceStyleContext';
import { makeSettingsStyles, PackCard, DiceStylePreview } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function DiceStyleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const { diceStyle, setDiceStyle } = useDiceStyle();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
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
                      if (locked) { setPremiumModalOpen(true); return; }
                      setDiceStyle(id);
                    }}
                    preview={<DiceStylePreview styleId={id} />}
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
