import React, { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium, PurchaseTarget } from '@/contexts/PremiumContext';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
import { PREMIUM_PRICE, REMOVE_ADS_PRICE, CUSTOMIZATION_PRICE } from '@/constants/pricing';

interface Props {
  visible: boolean;
  onClose: () => void;
  // When opened from a customization feature (theme/dice/soundtrack pickers,
  // the "Match" button), lead the all-in offer with customization perks and
  // offer customization as the cheaper alternative — instead of leading with
  // ad removal.
  intent?: 'default' | 'customization';
}

const ALL_IN_PERKS = ['No ads', 'Free continues', 'All themes & sound packs', 'All dice animations & styles'];
const ALL_IN_PERKS_CUSTOMIZATION = ['All themes & sound packs', 'All dice animations & styles', 'No ads', 'Free continues'];
const REMOVE_ADS_PERKS = ['No ads', 'Free continues'];
const CUSTOMIZATION_PERKS = ['All themes & sound packs', 'All dice animations & styles'];

export default function PremiumModal({ visible, onClose, intent = 'default' }: Props) {
  const { colors } = useTheme();
  const { hasCustomization, hasNoAds, upgrade, restorePurchases } = usePremium();
  const pendingTargetRef = useRef<PurchaseTarget | null>(null);

  // Four states: nothing yet, code-only (has customization, wants ads gone),
  // ads-only (has no_ads, wants customization — the fair upsell for someone
  // who already paid for ad-removal, so they're never asked to pay full
  // price again for something they own), or already has everything.
  const offer: 'allIn' | 'removeAds' | 'customization' | 'complete' =
    hasCustomization && hasNoAds ? 'complete'
    : hasCustomization ? 'removeAds'
    : hasNoAds ? 'customization'
    : 'allIn';

  // A fresh (owns-nothing) user opened from a customization feature: keep the
  // best-value all-in offer, but lead its perks with customization.
  const custIntent = intent === 'customization' && offer === 'allIn';

  const config: Record<Exclude<typeof offer, 'complete'>, { title: string; perks: string[]; price: string; target: PurchaseTarget }> = {
    allIn: { title: 'Topside: Dice Drop Premium', perks: custIntent ? ALL_IN_PERKS_CUSTOMIZATION : ALL_IN_PERKS, price: PREMIUM_PRICE, target: 'allIn' },
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

  // Start a purchase by first DISMISSING this modal, then triggering StoreKit
  // once the modal has actually gone away. On iPad, presenting the native
  // payment sheet on top of a still-open RN <Modal> silently fails to show —
  // iOS can't present the sheet from a view controller that's already
  // presenting one. (This passed iPhone testing but was rejected in iPad
  // review: "in-app purchase did not trigger the payment window.") Deferring
  // to the modal's onDismiss makes StoreKit present from the underlying
  // screen. Android has no such presentation conflict, so it buys directly.
  const startPurchase = (t: PurchaseTarget) => {
    if (Platform.OS === 'ios') {
      pendingTargetRef.current = t;
      onClose(); // onDismiss (below) runs the purchase after the modal closes
    } else {
      onClose();
      void upgrade(t);
    }
  };
  const handleDismiss = () => {
    const t = pendingTargetRef.current;
    if (t) { pendingTargetRef.current = null; void upgrade(t); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={handleDismiss}>
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
            onPress={() => startPurchase(target)}
          >
            <Text style={[styles.btnText, { color: colors.accentText }]}>
              {offer === 'allIn' ? `Upgrade — ${price}` : `${title} — ${price}`}
            </Text>
          </TouchableOpacity>
          {offer === 'allIn' && (
            <TouchableOpacity
              onPress={() => startPurchase(custIntent ? 'customization' : 'removeAds')}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              style={styles.secondaryOfferBtn}
            >
              <Text style={[styles.secondaryOffer, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                {custIntent ? `Or just Customization — ${CUSTOMIZATION_PRICE}` : `Or just Remove Ads — ${REMOVE_ADS_PRICE}`}
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
