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

// Full-screen ad preloading is deliberately DEFERRED out of the cold-launch
// window: each load spins up a WebView + network fetch, and doing both during
// startup (alongside music/SFX loading and the first Skia paint) was a big
// chunk of the first-round jank. Nothing needs them early — the FIRST run of
// a session never shows an interstitial, and the rewarded ad isn't needed
// until the first game over — so loading kicks off at the first game start
// (game screen mount), with a timer fallback in app/_layout.tsx for sessions
// that idle on the home screen. Both must ALSO wait for SDK init (which waits
// for the UMP consent flow), so the two preconditions gate the actual load.
export let adsReady = false; // SDK initialized AND preload requested — safe to load
let sdkInitialized = false;
let preloadRequested = false;
// True while a round is actively being played (pieces falling). Loading ads
// spins up WebViews on the main thread, which visibly steals frames from
// live gameplay — so a requested preload WAITS here and fires at the next
// calm moment (pause, game over, or back on the home screen).
let gameplayActive = false;

function maybePreload() {
  if (!sdkInitialized || !preloadRequested || gameplayActive || adsReady) return;
  adsReady = true;
  rewardedAd.load();
  interstitialAd.load();
}

/** Call once mobileAds().initialize() has resolved (post-consent). */
export function markAdsInitialized() {
  sdkInitialized = true;
  maybePreload();
}

/** Request the deferred preload — idempotent, waits for SDK init if needed. */
export function preloadAllAds() {
  preloadRequested = true;
  maybePreload();
}

/** Game screen reports live-play state; flipping to false releases a pending preload. */
export function setGameplayActive(v: boolean) {
  gameplayActive = v;
  maybePreload();
}
