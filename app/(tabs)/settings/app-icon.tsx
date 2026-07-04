import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { makeSettingsStyles } from '@/components/settings/SettingsShared';
import { APP_ICON_IDS, APP_ICON_META, APP_ICON_SUPPORTED, AppIconId, getAppIcon, setAppIcon } from '@/lib/appIcon';

const PREVIEW_SOURCES: Record<AppIconId, any> = {
  'default':              require('@/assets/images/app-icons/default.png'),
  'AppIcon-WarmSerenity': require('@/assets/images/app-icons/warm-serenity.png'),
  'AppIcon-Cream':        require('@/assets/images/app-icons/cream.png'),
};

export default function AppIconScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const [current, setCurrent] = useState<AppIconId>('default');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    getAppIcon().then(setCurrent);
  }, []));

  if (!APP_ICON_SUPPORTED) {
    return (
      <View style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.section, { marginBottom: 24 }]}>
            <View style={[styles.sectionCard, { padding: 16 }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                App icon switching isn't available on this platform yet.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleSelect = async (id: AppIconId) => {
    if (id === current || busy) return;
    setBusy(true);
    const ok = await setAppIcon(id);
    if (ok) setCurrent(id);
    setBusy(false);
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            {APP_ICON_IDS.map((id, i) => (
              <TouchableOpacity
                key={id}
                style={[
                  iconRow.row,
                  i < APP_ICON_IDS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                ]}
                onPress={() => handleSelect(id)}
                activeOpacity={0.7}
                disabled={busy}
              >
                <Image source={PREVIEW_SOURCES[id]} style={iconRow.thumb} />
                <Text style={[styles.rowLabel, { marginLeft: 12 }]}>{APP_ICON_META[id].label}</Text>
                {current === id && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const iconRow = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  thumb: { width: 48, height: 48, borderRadius: 12 },
});
