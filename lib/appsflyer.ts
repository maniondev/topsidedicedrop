import appsFlyer from 'react-native-appsflyer';
import { Platform } from 'react-native';

const AF_DEV_KEY  = 'VYkiKAdLCMByCM4Qemktt7';
const IOS_APP_ID  = '6778957322';

export function initAppsFlyer() {
  appsFlyer.initSdk(
    {
      devKey:                            AF_DEV_KEY,
      isDebug:                           __DEV__,
      appId:                             Platform.OS === 'ios' ? IOS_APP_ID : undefined,
      onInstallConversionDataListener:   true,
      onDeepLinkListener:                false,
      timeToWaitForATTUserAuthorization: 60,
    },
    () => {},
    () => {},
  );
}

export function logPurchaseEvent(revenueUSD: number, currency = 'USD') {
  appsFlyer.logEvent('af_purchase', {
    af_revenue:    revenueUSD,
    af_currency:   currency,
    af_content_id: 'dicedrop_premium',
  });
}
