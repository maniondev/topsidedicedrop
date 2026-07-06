import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium, PurchaseTarget } from '@/contexts/PremiumContext';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
import { PREMIUM_PRICE, REMOVE_ADS_PRICE, CUSTOMIZATION_PRICE } from '@/constants/pricing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const ALL_IN_PERKS = ['No ads', 'Free continues', 'All themes & sound packs', 'All dice animations & styles'];
const REMOVE_ADS_PERKS = ['No ads', 'Free continues'];
const CUSTOMIZATION_PERKS = ['All themes & sound packs', 'All dice animations & styles'];

export default function PremiumModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { hasCustomization, hasNoAds, upgrade, restorePurchases } = usePremium();

  // Four states: nothing yet, code-only (has customization, wants ads gone),
  // ads-only (has no_ads, wants customization — the fair upsell for someone
  // who already paid for ad-removal, so they're never asked to pay full
  // price again for something they own), or already has everything.
  const offer: 'allIn' | 'removeAds' | 'customization' | 'complete' =
    hasCustomization && hasNoAds ? 'complete'
    : hasCustomization ? 'removeAds'
    : hasNoAds ? 'customization'
    : 'allIn';

  const config: Record<Exclude<typeof offer, 'complete'>, { title: string; perks: string[]; price: string; target: PurchaseTarget }> = {
    allIn: { title: 'Topside: Dice Drop Premium', perks: ALL_IN_PERKS, price: PREMIUM_PRICE, target: 'allIn' },
    removeAds: { title: 'Remove Ads', perks: REMOVE_ADS_PERKS, price: REMOVE_ADS_PRICE, target: 'removeAds' },
    customization: { title: 'Unlock Customization', perks: CUSTOMIZATION_PERKS, price: CUSTOMIZATION_PRICE, target: 'customization' },
  };

  if (offer === 'complete') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
              You have everything unlocked!
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.close, { color: colors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const { title, perks, price, target } = config[offer];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>{title}</Text>
          <View style={styles.perks}>
            {perks.map(p => (
              <Text key={p} style={[styles.perk, { color: colors.textSecondary }]}>• {p}</Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={async () => { await upgrade(target); onClose(); }}
          >
            <Text style={[styles.btnText, { color: colors.accentText }]}>
              {offer === 'allIn' ? `Upgrade — ${price}` : `${title} — ${price}`}
            </Text>
          </TouchableOpacity>
          {offer === 'allIn' && (
            <TouchableOpacity
              onPress={async () => { await upgrade('removeAds'); onClose(); }}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              style={styles.secondaryOfferBtn}
            >
              <Text style={[styles.secondaryOffer, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                Or just Remove Ads — {REMOVE_ADS_PRICE}
              </Text>
            </TouchableOpacity>
          )}
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
  secondaryOfferBtn: { paddingVertical: 8, alignSelf: 'stretch', alignItems: 'center' },
  secondaryOffer: { fontSize: IS_LARGE ? 16 : 13, textAlign: 'center' },
  restore: { fontSize: IS_LARGE ? 17 : 14 },
  close: { fontSize: IS_LARGE ? 17 : 14 },
});
