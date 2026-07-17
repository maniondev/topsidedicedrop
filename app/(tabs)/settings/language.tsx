import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { makeSettingsStyles, SettingsSubHeader } from '@/components/settings/SettingsShared';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, setLanguage, SupportedLanguage } from '@/lib/i18n';

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  // Track locally so the checkmark moves instantly; i18n.language also drives it
  // via the re-render, but local state avoids any perceived lag on tap.
  const [current, setCurrent] = useState<string>(i18n.language);

  const handleSelect = (code: SupportedLanguage) => {
    setCurrent(code);
    void setLanguage(code);
  };

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title={t('settings.language.title')} colors={colors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {SUPPORTED_LANGUAGES.map((code, i) => {
              const selected = current === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    langStyles.row,
                    i < SUPPORTED_LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.separator },
                  ]}
                  onPress={() => handleSelect(code)}
                  activeOpacity={0.7}
                >
                  <Text style={[langStyles.label, { color: colors.text }]} numberOfLines={1}>
                    {LANGUAGE_NAMES[code]}
                  </Text>
                  {/* Always reserve the checkmark's slot so selecting a row can't
                      change its height and shift the list. */}
                  <View style={langStyles.check}>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const langStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, minHeight: 52 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  check: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
