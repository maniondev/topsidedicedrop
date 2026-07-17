import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { PREMIUM_PRICE, REMOVE_ADS_PRICE, CUSTOMIZATION_PRICE } from '@/constants/pricing';
import { logPurchaseEvent } from '@/lib/appsflyer';
import { setReviewPendingFromPurchase } from '@/lib/reviewPrompt';
import i18n from '@/lib/i18n';

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

// Display prices for the paywall. Seeded with the hardcoded USD strings from
// constants/pricing.ts and replaced with the store's own LOCALIZED
// priceString (e.g. "€4,99", "£3.99") once offerings resolve — so the button
// always shows exactly what Apple/Google will charge, in the user's currency.
export interface PremiumPrices {
  allIn: string;
  removeAds: string;
  customization: string;
}

const FALLBACK_PRICES: PremiumPrices = {
  allIn: PREMIUM_PRICE,
  removeAds: REMOVE_ADS_PRICE,
  customization: CUSTOMIZATION_PRICE,
};

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
  // Localized display prices (see PremiumPrices). USD fallbacks until (and
  // unless) offerings resolve.
  prices: PremiumPrices;
  // Cheap re-attempt hook for the paywall: if the launch prefetch failed
  // (e.g. offline at launch), opening the modal retries once via the SDK's
  // cache-first getOfferings.
  ensureLocalizedPrices: () => void;
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
  prices: FALLBACK_PRICES,
  ensureLocalizedPrices: () => {},
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

  // Localized display prices, seeded with the USD fallbacks. localizedRef
  // tracks whether real store prices have landed, so ensureLocalizedPrices
  // can be a no-op afterwards.
  const [prices, setPrices] = useState<PremiumPrices>(FALLBACK_PRICES);
  const localizedRef = useRef(false);
  const configuredRef = useRef(false);

  const applyOfferingPrices = useCallback((offerings: PurchasesOfferings) => {
    const pkgs = offerings.current?.availablePackages ?? [];
    const priceOf = (id: string): string | null =>
      pkgs.find(p => p.identifier === id)?.product.priceString ?? null;
    const next: PremiumPrices = {
      allIn:         priceOf(PACKAGE_ALL_IN)        ?? FALLBACK_PRICES.allIn,
      removeAds:     priceOf(PACKAGE_REMOVE_ADS)    ?? FALLBACK_PRICES.removeAds,
      customization: priceOf(PACKAGE_CUSTOMIZATION) ?? FALLBACK_PRICES.customization,
    };
    // Only mark localized (and re-render) if at least one real price landed.
    if (pkgs.length > 0) {
      localizedRef.current = true;
      setPrices(next);
    }
  }, []);

  const ensureLocalizedPrices = useCallback(() => {
    if (localizedRef.current || !configuredRef.current) return;
    // Cache-first in the SDK, so this is cheap when the launch prefetch
    // already succeeded and a real retry when it didn't (offline launch).
    Purchases.getOfferings().then(applyOfferingPrices).catch(() => {});
  }, [applyOfferingPrices]);

  useEffect(() => {
    const applyInfo = (info: CustomerInfo) => setRcState(readEntitlements(info));

    (async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        await Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY });
        configuredRef.current = true;
        // Warm the offerings cache now (fire-and-forget). upgrade() fetches
        // offerings at buy-tap time, and the FIRST fetch of a session is the
        // slow one — RevenueCat API + StoreKit product-metadata validation,
        // several seconds in sandbox/TestFlight — happening after the paywall
        // has already dismissed (the iPad StoreKit-presentation fix), i.e.
        // with no visual feedback. Prefetching moves that cost to launch;
        // the tap-time getOfferings() then resolves from the SDK's cache.
        // The same fetch feeds the paywall's localized display prices.
        Purchases.getOfferings().then(applyOfferingPrices).catch(() => {});
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
  }, [applyOfferingPrices]);

  const upgrade = useCallback(async (target: PurchaseTarget) => {
    try {
      const offerings = await Purchases.getOfferings();
      const packageId = target === 'allIn' ? PACKAGE_ALL_IN
        : target === 'removeAds' ? PACKAGE_REMOVE_ADS
        : PACKAGE_CUSTOMIZATION;
      const pkg: PurchasesPackage | undefined = offerings.current?.availablePackages.find(
        p => p.identifier === packageId,
      );
      if (!pkg) { Alert.alert(i18n.t('premium.errorTitle'), i18n.t('premium.noPackage')); return; }
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
      if (!e.userCancelled) Alert.alert(i18n.t('premium.purchaseFailedTitle'), e.message ?? i18n.t('premium.restoreFailedBody'));
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      const restored = readEntitlements(info);
      setRcState(restored);
      const has = restored.customization || restored.noAds;
      Alert.alert(
        has ? i18n.t('premium.restoreTitle') : i18n.t('premium.nothingTitle'),
        has ? i18n.t('premium.restoreBody') : i18n.t('premium.nothingBody'),
      );
    } catch (e: any) {
      Alert.alert(i18n.t('premium.restoreFailedTitle'), e.message ?? i18n.t('premium.restoreFailedBody'));
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
        Alert.alert(i18n.t('premium.redeemTitle'), i18n.t('premium.redeemAndroidBody'));
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
      Alert.alert(i18n.t('premium.redeemTitle'), i18n.t('premium.redeemErrorBody'));
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
      devToggleCustomization, devToggleNoAds, prices, ensureLocalizedPrices,
    }),
    [hasCustomization, hasNoAds, isLoading, upgrade, restorePurchases, redeemCode,
      devToggleCustomization, devToggleNoAds, prices, ensureLocalizedPrices],
  );

  return <PremiumCtx.Provider value={value}>{children}</PremiumCtx.Provider>;
}

export function usePremium() {
  return useContext(PremiumCtx);
}
