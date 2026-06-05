import { Platform } from 'react-native';
import { RewardedAd, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

// TODO: Replace placeholder IDs with real AdMob units for com.topside.merge
const REWARDED_IOS     = 'ca-app-pub-REPLACE/REPLACE_REWARDED_IOS';
const REWARDED_ANDROID = 'ca-app-pub-REPLACE/REPLACE_REWARDED_ANDROID';
const INTER_IOS        = 'ca-app-pub-REPLACE/REPLACE_INTER_IOS';
const INTER_ANDROID    = 'ca-app-pub-REPLACE/REPLACE_INTER_ANDROID';

export const rewardedAd = RewardedAd.createForAdRequest(
  __DEV__ ? TestIds.REWARDED : Platform.OS === 'ios' ? REWARDED_IOS : REWARDED_ANDROID,
  { requestNonPersonalizedAdsOnly: false },
);

export const interstitialAd = InterstitialAd.createForAdRequest(
  __DEV__ ? TestIds.INTERSTITIAL : Platform.OS === 'ios' ? INTER_IOS : INTER_ANDROID,
  { requestNonPersonalizedAdsOnly: false },
);

export let adsReady = false;

export function preloadAllAds() {
  adsReady = true;
  rewardedAd.load();
  interstitialAd.load();
}
