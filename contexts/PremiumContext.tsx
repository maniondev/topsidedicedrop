import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { logPurchaseEvent } from '@/lib/appsflyer';
import { setReviewPendingFromPurchase } from '@/lib/reviewPrompt';

const RC_IOS_KEY     = 'appl_bEfjghrErvdIBhSvAvrEMXEAInP';
const RC_ANDROID_KEY = 'goog_eyVRQLwacLpBhQjOGFOVqesoYMT';

// Two independent capabilities, replacing the old single "Topside: Dice Drop
// Premium" entitlement. The $4.99 all-in product grants both (plus the old
// entitlement, kept solely so it's never deleted/renamed — existing
// purchasers upgraded to both new entitlements automatically the moment
// RevenueCat's product->entitlement mapping was updated, no client change
// needed for them). $1.99 grants only NO_ADS_ENTITLEMENT. The $3.99
// CUSTOMIZATION product is normally reached only via a free offer code, but
// it's also the fair upsell for someone who already bought Remove Ads and
// later wants customization — without it they'd have to pay full price
// again for ad-removal/continues they already own.
const CUSTOMIZATION_ENTITLEMENT = 'customization';
const NO_ADS_ENTITLEMENT = 'no_ads';

// Package identifiers as configured in the RevenueCat "default" offering.
const PACKAGE_ALL_IN = '$rc_lifetime';
const PACKAGE_REMOVE_ADS = 'removeads';
const PACKAGE_CUSTOMIZATION = 'customization';

export type PurchaseTarget = 'allIn' | 'removeAds' | 'customization';

interface PremiumCtxType {
  hasCustomization: boolean;
  hasNoAds: boolean;
  isLoading: boolean;
  // target picks which package to buy — callers (the paywall) decide based
  // on current state: no entitlements -> 'allIn', customization-only -> 'removeAds'.
  upgrade: (target: PurchaseTarget) => Promise<void>;
  restorePurchases: () => Promise<void>;
  // iOS only: opens Apple's native code redemption sheet (offer codes).
  // Android codes are redeemed via the Play Store directly; no in-app UI.
  redeemCode: () => Promise<void>;
  // dev-only: toggle each capability independently without RevenueCat, so
  // all four states (locked / code-only / ads-removed-only / full) are
  // testable without real purchases.
  devToggleCustomization: () => void;
  devToggleNoAds: () => void;
}

const PremiumCtx = createContext<PremiumCtxType>({
  hasCustomization: false,
  hasNoAds: false,
  isLoading: true,
  upgrade: async () => {},
  restorePurchases: async () => {},
  redeemCode: async () => {},
  devToggleCustomization: () => {},
  devToggleNoAds: () => {},
});

function readEntitlements(info: CustomerInfo): { customization: boolean; noAds: boolean } {
  return {
    customization: typeof info.entitlements.active[CUSTOMIZATION_ENTITLEMENT] !== 'undefined',
    noAds: typeof info.entitlements.active[NO_ADS_ENTITLEMENT] !== 'undefined',
  };
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  // Real state from RevenueCat.
  const [rcState, setRcState] = useState({ customization: false, noAds: false });
  const [isLoading, setIsLoading] = useState(true);
  // Dev-only overrides layered on top of rcState (not replacing it), so a
  // toggle reflects real state again once cleared. Derived below rather
  // than written into a separate "current" state, so a real RevenueCat
  // update later can never clobber an active override with a stale closure.
  const [devOverride, setDevOverride] = useState<{ customization?: boolean; noAds?: boolean }>({});

  const hasCustomization = devOverride.customization ?? rcState.customization;
  const hasNoAds = devOverride.noAds ?? rcState.noAds;

  useEffect(() => {
    const applyInfo = (info: CustomerInfo) => setRcState(readEntitlements(info));

    (async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        await Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY });
        const info = await Purchases.getCustomerInfo();
        applyInfo(info);
      } catch (e) {
        if (__DEV__) console.warn('RevenueCat setup error:', e);
      } finally {
        setIsLoading(false);
      }
    })();

    Purchases.addCustomerInfoUpdateListener(applyInfo);
    return () => { Purchases.removeCustomerInfoUpdateListener(applyInfo); };
  }, []);

  const upgrade = useCallback(async (target: PurchaseTarget) => {
    try {
      const offerings = await Purchases.getOfferings();
      const packageId = target === 'allIn' ? PACKAGE_ALL_IN
        : target === 'removeAds' ? PACKAGE_REMOVE_ADS
        : PACKAGE_CUSTOMIZATION;
      const pkg: PurchasesPackage | undefined = offerings.current?.availablePackages.find(
        p => p.identifier === packageId,
      );
      if (!pkg) { Alert.alert('Error', 'No package found. Try again later.'); return; }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const bought = readEntitlements(customerInfo);
      if (bought.customization || bought.noAds) {
        logPurchaseEvent(pkg.product.price, pkg.product.currencyCode ?? 'USD');
        // Queue a review prompt for the next eligible game-over (rides the
        // premium delight rather than interrupting the purchase).
        setReviewPendingFromPurchase();
      }
      setRcState(bought);
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      const restored = readEntitlements(info);
      setRcState(restored);
      const has = restored.customization || restored.noAds;
      Alert.alert(has ? 'Restored!' : 'Nothing to restore', has ? 'Purchases restored.' : 'No previous purchase found.');
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Something went wrong.');
    }
  }, []);

  const redeemCode = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      // Android has no in-app redemption sheet — Google Play's own redeem
      // page is the real equivalent. The entitlement appears automatically
      // via the customerInfo update listener once redeemed; the app doesn't
      // need to know when that happens.
      try {
        await Linking.openURL('https://play.google.com/redeem');
      } catch {
        Alert.alert('Redeem Code', 'Open the Play Store app and go to Payments & subscriptions > Redeem code.');
      }
      return;
    }
    // NOTE: Apple's code redemption sheet is a Simulator no-op by design —
    // it only presents on a real device signed into a sandbox or production
    // Apple ID. If this silently does nothing while testing, that's why.
    try {
      await Purchases.presentCodeRedemptionSheet();
      // The customerInfo update listener picks up the new entitlement once
      // the sheet reports a successful redemption — nothing else to do here.
    } catch (e: any) {
      if (__DEV__) console.warn('Code redemption error:', e);
      Alert.alert('Redeem Code', 'Could not open the redemption screen. Make sure you\'re signed into the App Store and try again.');
    }
  }, []);

  const devToggleCustomization = useCallback(() => {
    if (!__DEV__) return;
    setDevOverride(prev => ({ ...prev, customization: !(prev.customization ?? rcState.customization) }));
  }, [rcState.customization]);

  const devToggleNoAds = useCallback(() => {
    if (!__DEV__) return;
    setDevOverride(prev => ({ ...prev, noAds: !(prev.noAds ?? rcState.noAds) }));
  }, [rcState.noAds]);

  const value = useMemo(
    () => ({
      hasCustomization, hasNoAds, isLoading, upgrade, restorePurchases, redeemCode,
      devToggleCustomization, devToggleNoAds,
    }),
    [hasCustomization, hasNoAds, isLoading, upgrade, restorePurchases, redeemCode,
      devToggleCustomization, devToggleNoAds],
  );

  return <PremiumCtx.Provider value={value}>{children}</PremiumCtx.Provider>;
}

export function usePremium() {
  return useContext(PremiumCtx);
}
