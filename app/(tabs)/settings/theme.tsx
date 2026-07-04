import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { ThemeId, THEME_IDS, ThemeMeta } from '@/constants/theme';
import { makeSettingsStyles, PickerRow, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

const FREE_THEMES: ThemeId[] = ['dicedrop', 'light', 'dark'];

export default function ThemeScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Theme" colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {THEME_IDS.map((id, i) => {
              const meta = ThemeMeta[id];
              const [bg, , accent] = meta.swatches;
              const locked = !isPremium && !FREE_THEMES.includes(id);
              return (
                <PickerRow
                  key={id}
                  label={meta.label}
                  selected={themeId === id}
                  locked={locked}
                  onSelect={() => {
                    if (locked) { setPremiumModalOpen(true); return; }
                    setTheme(id);
                  }}
                  swatchColor={bg}
                  preview={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: accent }} />}
                  isLast={i === THEME_IDS.length - 1}
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
