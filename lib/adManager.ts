import { Platform } from 'react-native';
import { RewardedAd, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

const REWARDED_IOS     = 'ca-app-pub-5499315559222720/3518477137';
const REWARDED_ANDROID = 'ca-app-pub-5499315559222720/1933932727';

const INTERSTITIAL_IOS     = 'ca-app-pub-5499315559222720/5044311218';
const INTERSTITIAL_ANDROID = 'ca-app-pub-5499315559222720/8308768801';

export const rewardedAd = RewardedAd.createForAdRequest(
  __DEV__ ? TestIds.REWARDED : Platform.OS === 'ios' ? REWARDED_IOS : REWARDED_ANDROID,
  { requestNonPersonalizedAdsOnly: false },
);

export const interstitialAd = InterstitialAd.createForAdRequest(
  __DEV__ ? TestIds.INTERSTITIAL : Platform.OS === 'ios' ? INTERSTITIAL_IOS : INTERSTITIAL_ANDROID,
  { requestNonPersonalizedAdsOnly: false },
);

export let adsReady = false;

export function preloadAllAds() {
  adsReady = true;
  rewardedAd.load();
  interstitialAd.load();
}
