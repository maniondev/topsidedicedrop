import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';

// TODO: Create a new RevenueCat project for com.topside.merge and replace these keys
const RC_IOS_KEY     = 'appl_MuDtWbWFehGtuTCrlFmmNFpgcdI';
const RC_ANDROID_KEY = 'goog_avnhBAwWoKwVzOsyyhTbkeVMkGz';
const ENTITLEMENT_ID = 'Topside Merge Premium';

interface PremiumCtxType {
  isPremium: boolean;
  isLoading: boolean;
  upgrade: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  downgrade: () => void;
}

const PremiumCtx = createContext<PremiumCtxType>({
  isPremium: false,
  isLoading: true,
  upgrade: async () => {},
  restorePurchases: async () => {},
  downgrade: () => {},
});

function hasEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        await Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY });
        const info = await Purchases.getCustomerInfo();
        setIsPremium(hasEntitlement(info));
      } catch (e) {
        console.warn('RevenueCat setup error:', e);
      } finally {
        setIsLoading(false);
      }
    })();

    const listener = (info: CustomerInfo) => setIsPremium(hasEntitlement(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => { Purchases.removeCustomerInfoUpdateListener(listener); };
  }, []);

  const upgrade = useCallback(async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) { Alert.alert('Error', 'No package found. Try again later.'); return; }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setIsPremium(hasEntitlement(customerInfo));
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      const has = hasEntitlement(info);
      setIsPremium(has);
      Alert.alert(has ? 'Restored!' : 'Nothing to restore', has ? 'Premium restored.' : 'No previous purchase found.');
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Something went wrong.');
    }
  }, []);

  const downgrade = useCallback(() => { if (__DEV__) setIsPremium(false); }, []);

  const value = useMemo(
    () => ({ isPremium, isLoading, upgrade, restorePurchases, downgrade }),
    [isPremium, isLoading, upgrade, restorePurchases, downgrade],
  );

  return <PremiumCtx.Provider value={value}>{children}</PremiumCtx.Provider>;
}

export function usePremium() {
  return useContext(PremiumCtx);
}
