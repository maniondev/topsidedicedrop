import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useDiceStyle, DiceStyleMeta, DICE_STYLE_IDS } from '@/contexts/DiceStyleContext';
import { makeSettingsStyles, PickerRow, DiceStylePreview, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

export default function DiceStyleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { hasCustomization } = usePremium();
  const { diceStyle, setDiceStyle } = useDiceStyle();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Dice Style" colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {DICE_STYLE_IDS.map((id, i) => {
              const meta = DiceStyleMeta[id];
              const locked = !meta.free && !hasCustomization;
              return (
                <PickerRow
                  key={id}
                  label={meta.label}
                  selected={diceStyle === id}
                  locked={locked}
                  onSelect={() => {
                    if (locked) { setPremiumModalOpen(true); return; }
                    setDiceStyle(id);
                  }}
                  preview={<DiceStylePreview styleId={id} size={32} />}
                  bare
                  compact
                  isLast={i === DICE_STYLE_IDS.length - 1}
                  colors={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} intent="customization" />
    </View>
  );
}
