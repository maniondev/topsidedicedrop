import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Linking } from 'react-native';
import { useTranslation, Trans } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalizedFont } from '@/lib/fonts';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
const TOS_URL     = 'https://topside.games/dicedrop/tos';
const PRIVACY_URL = 'https://topside.games/dicedrop/privacy';

interface Props {
  visible: boolean;
  onClose: () => void;
  showConsent?: boolean;
}

const CONTROLS = ['howToPlay.controls.move', 'howToPlay.controls.rotate', 'howToPlay.controls.drop'];

const RULES: { title: string; body: string }[] = [
  { title: 'howToPlay.rules.mergeTitle',   body: 'howToPlay.rules.mergeBody' },
  { title: 'howToPlay.rules.sixesTitle',   body: 'howToPlay.rules.sixesBody' },
  { title: 'howToPlay.rules.chainsTitle',  body: 'howToPlay.rules.chainsBody' },
  { title: 'howToPlay.rules.surviveTitle', body: 'howToPlay.rules.surviveBody' },
];

export default function HowToPlayModal({ visible, onClose, showConsent }: Props) {
  const { t } = useTranslation();
  const font = useLocalizedFont();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: font('Rubik_700Bold') }]}>
            {t('home.howToPlay')}
          </Text>

          <View style={styles.rules}>
            <View style={styles.rule}>
              <Text style={[styles.ruleTitle, { color: colors.accent }]}>{t('howToPlay.dropTitle')}</Text>
              {CONTROLS.map((c, i) => (
                <Text key={i} style={[styles.ruleBody, { color: colors.text }]}>
                  {t(c)}
                </Text>
              ))}
            </View>
            {RULES.map((r, i) => (
              <View key={i} style={styles.rule}>
                <Text style={[styles.ruleTitle, { color: colors.accent }]}>{t(r.title)}</Text>
                <Text style={[styles.ruleBody, { color: colors.text }]}>{t(r.body)}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: colors.accentText }]}>{t('common.gotIt')}</Text>
          </TouchableOpacity>
          {showConsent && (
            <Text style={[styles.consent, { color: colors.textMuted }]}>
              <Trans
                i18nKey="howToPlay.consent"
                components={{
                  terms:   <Text style={{ color: colors.accent }} onPress={() => Linking.openURL(TOS_URL)} />,
                  privacy: <Text style={{ color: colors.accent }} onPress={() => Linking.openURL(PRIVACY_URL)} />,
                }}
              />
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card:      { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  title:     { fontSize: IS_LARGE ? 32 : 22, textAlign: 'center' },
  rules:     { gap: IS_LARGE ? 16 : 10 },
  rule:      { gap: 2 },
  ruleTitle: { fontSize: IS_LARGE ? 23 : 16, fontWeight: '700' },
  ruleBody:  { fontSize: IS_LARGE ? 19 : 13, lineHeight: IS_LARGE ? 27 : 19 },
  verb:      { fontWeight: '700' },
  btn:       { paddingVertical: IS_LARGE ? 20 : 13, borderRadius: 12, alignItems: 'center' },
  btnText:   { fontSize: IS_LARGE ? 22 : 16, fontWeight: '700' },
  consent:   { fontSize: IS_LARGE ? 14 : 11, lineHeight: IS_LARGE ? 20 : 16, textAlign: 'center', marginTop: 2 },
});
