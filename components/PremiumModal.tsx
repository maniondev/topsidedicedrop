import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;
import { PREMIUM_PRICE } from '@/constants/pricing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { upgrade, restorePurchases } = usePremium();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            Topside: Dice Drop Premium
          </Text>
          <View style={styles.perks}>
            {[
              'No ads',
              'Free continues',
              'All themes & sound packs',
              'All dice animations & styles',
            ].map(p => (
              <Text key={p} style={[styles.perk, { color: colors.textSecondary }]}>• {p}</Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={async () => { await upgrade(); onClose(); }}
          >
            <Text style={[styles.btnText, { color: colors.accentText }]}>
              Upgrade — {PREMIUM_PRICE}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={restorePurchases}>
            <Text style={[styles.restore, { color: colors.textMuted }]}>Restore Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.close, { color: colors.textMuted }]}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: IS_LARGE ? 20 : 16 },
  title: { fontSize: IS_LARGE ? 30 : 22, textAlign: 'center' },
  perks: { alignSelf: 'stretch', gap: IS_LARGE ? 10 : 6 },
  perk: { fontSize: IS_LARGE ? 20 : 16 },
  btn: { width: '100%', paddingVertical: IS_LARGE ? 20 : 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: IS_LARGE ? 20 : 17, fontWeight: '700' },
  restore: { fontSize: IS_LARGE ? 17 : 14 },
  close: { fontSize: IS_LARGE ? 17 : 14 },
});
