import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { ThemeId, THEME_IDS } from '@/constants/theme';
import { makeSettingsStyles, ThemeCard } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';
import { useState } from 'react';

const FREE_THEMES: ThemeId[] = ['dice', 'light', 'dark'];

export default function ThemeScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            <View style={styles.themeGrid}>
              {THEME_IDS.map(id => (
                <ThemeCard
                  key={id}
                  id={id}
                  selected={themeId === id}
                  locked={!isPremium && !FREE_THEMES.includes(id)}
                  onSelect={() => {
                    if (!isPremium && !FREE_THEMES.includes(id)) { setPremiumModalOpen(true); return; }
                    setTheme(id);
                  }}
                  colors={colors}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
