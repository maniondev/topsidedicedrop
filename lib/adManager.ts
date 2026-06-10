import { Platform } from 'react-native';
import { RewardedAd, TestIds } from 'react-native-google-mobile-ads';

const REWARDED_IOS     = 'ca-app-pub-5499315559222720/3518477137';
const REWARDED_ANDROID = 'ca-app-pub-5499315559222720/1933932727';

export const rewardedAd = RewardedAd.createForAdRequest(
  __DEV__ ? TestIds.REWARDED : Platform.OS === 'ios' ? REWARDED_IOS : REWARDED_ANDROID,
  { requestNonPersonalizedAdsOnly: false },
);

export let adsReady = false;

export function preloadAllAds() {
  adsReady = true;
  rewardedAd.load();
}
