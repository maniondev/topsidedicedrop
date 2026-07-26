import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { makeSettingsStyles, PickerRow, SettingsSubHeader } from '@/components/settings/SettingsShared';
import { APP_ICON_IDS, APP_ICON_SUPPORTED, AppIconId, getAppIcon, setAppIcon } from '@/lib/appIcon';

const PREVIEW_SOURCES: Record<AppIconId, any> = {
  'default':            require('@/assets/images/app-icons/icon-brown.png'),
  'AppIcon-Cream':      require('@/assets/images/app-icons/cream.png'),
  'AppIcon-Neon':       require('@/assets/images/app-icons/neon.png'),
  'AppIcon-Blue':       require('@/assets/images/app-icons/blue.png'),
  'AppIcon-IconBrown':  require('@/assets/images/app-icons/default.png'),
  'AppIcon-IconCream':  require('@/assets/images/app-icons/icon-cream.png'),
  'AppIcon-IconNeon':   require('@/assets/images/app-icons/icon-neon.png'),
  'AppIcon-IconBlue':   require('@/assets/images/app-icons/icon-blue.png'),
};

export default function AppIconScreen() {
  const { t } = useTranslation();
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
        <SettingsSubHeader title={t('settings.customize.appIcon')} colors={colors} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.section, { marginBottom: 24 }]}>
            <View style={[styles.sectionCard, { padding: 16 }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                {t('settings.appIcon.unsupported')}
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

  const firstGroup  = APP_ICON_IDS.slice(0, 4);
  const secondGroup = APP_ICON_IDS.slice(4);

  return (
    <View style={styles.safe}>
      <SettingsSubHeader title={t('settings.customize.appIcon')} colors={colors} />
      <ScrollView contentContainerStyle={[styles.content, { gap: 16 }]}>
        <View style={styles.sectionCard}>
          {firstGroup.map((id, i) => (
            <PickerRow
              key={id}
              label={t(`appIconNames.${id}`)}
              selected={current === id}
              locked={false}
              onSelect={() => handleSelect(id)}
              preview={<Image source={PREVIEW_SOURCES[id]} style={{ width: '100%', height: '100%' }} />}
              isLast={i === firstGroup.length - 1}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
        <View style={[styles.sectionCard, { marginBottom: 24 }]}>
          {secondGroup.map((id, i) => (
            <PickerRow
              key={id}
              label={t(`appIconNames.${id}`)}
              selected={current === id}
              locked={false}
              onSelect={() => handleSelect(id)}
              preview={<Image source={PREVIEW_SOURCES[id]} style={{ width: '100%', height: '100%' }} />}
              isLast={i === secondGroup.length - 1}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
