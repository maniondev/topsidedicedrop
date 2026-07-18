import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_STORE_ID    = '6778957322';           // App Store Connect app ID (see eas.json)
const ANDROID_PACKAGE = 'com.topside.dicedrop';

const OPTOUT_FLAG  = 'tm_review_optout';
const LAST_FLAG    = 'tm_review_last';
const RATED_FLAG   = 'tm_review_rated';
const PURCHASE_FLAG = 'tm_review_pending_purchase';

export const REVIEW_FIRST_AT = 3;
export const REVIEW_EVERY    = 10;

/** Unified cooldown: at least REVIEW_EVERY runs since the last prompt (any source).
 *  lastPrompted === 0 means "never prompted yet", so the first prompt is allowed. */
export function reviewCooldownPassed(totalRuns: number, lastPrompted: number): boolean {
  return lastPrompted === 0 || totalRuns - lastPrompted >= REVIEW_EVERY;
}

/**
 * The run-count HALF of the milestone gate — the other half (this run set a
 * new best score for its difficulty) is checked by the caller, so the prompt
 * always lands on a win moment instead of an arbitrary Nth game.
 *
 * Strictly MORE than REVIEW_FIRST_AT games ever for the first prompt (games
 * 1-3 are the warm-up; the first new best from game 4 on fires), and strictly
 * more than REVIEW_EVERY games since the last prompt for repeats (prompt at
 * game 4 → games 5-14 are the wait; the first new best from game 15 on
 * fires — a new best DURING the wait doesn't fire, but still raises the bar).
 */
export function reviewRunGateOpen(totalRuns: number, lastPrompted: number): boolean {
  return lastPrompted === 0
    ? totalRuns > REVIEW_FIRST_AT
    : totalRuns - lastPrompted > REVIEW_EVERY;
}

export async function getReviewOptedOut(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPTOUT_FLAG)) === '1';
  } catch {
    return false;
  }
}

export async function setReviewOptedOut(): Promise<void> {
  try {
    await AsyncStorage.setItem(OPTOUT_FLAG, '1');
  } catch {}
}

// ── Native-sheet quota (iOS: max 3 requestReview dialogs per 365 days) ───────
// Apple silently no-ops requestReview() past the quota, with no API to detect
// it. We timestamp every native request WE trigger and suppress our own gate
// entirely once 3 landed in the trailing year — better no prompt than a "Rate"
// tap that visibly does nothing. (Timestamps are per-install; Apple's counter
// is per Apple ID. After a reinstall we may under-count and show a gate whose
// native sheet stays silent — unavoidable, and the gate simply survives to
// try again at the next milestone since nothing gets consumed on that path.)

const NATIVE_REQS_FLAG   = 'tm_review_native_reqs';
export const NATIVE_REVIEW_QUOTA = 3;
const QUOTA_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

async function getNativeRequestTimes(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(NATIVE_REQS_FLAG);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - QUOTA_WINDOW_MS;
    return arr.filter((t): t is number => typeof t === 'number' && t > cutoff);
  } catch {
    return [];
  }
}

/** False once we've triggered 3 native review sheets in the trailing 365 days. */
export async function getNativeReviewQuotaAvailable(): Promise<boolean> {
  return (await getNativeRequestTimes()).length < NATIVE_REVIEW_QUOTA;
}

/** Record one native requestReview() trigger (call alongside openNativeReview). */
export async function recordNativeReviewRequest(): Promise<void> {
  try {
    const times = await getNativeRequestTimes();
    times.push(Date.now());
    await AsyncStorage.setItem(NATIVE_REQS_FLAG, JSON.stringify(times));
  } catch {}
}

export async function getReviewLastPrompted(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(LAST_FLAG);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setReviewLastPrompted(count: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_FLAG, String(count));
  } catch {}
}

/** Set when the user buys premium — triggers one review prompt at the next
 *  eligible game-over (gated by opt-out and the shared cooldown). */
export async function setReviewPendingFromPurchase(): Promise<void> {
  try {
    await AsyncStorage.setItem(PURCHASE_FLAG, '1');
  } catch {}
}

export async function getReviewPendingFromPurchase(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PURCHASE_FLAG)) === '1';
  } catch {
    return false;
  }
}

export async function clearReviewPendingFromPurchase(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PURCHASE_FLAG);
  } catch {}
}

export async function getHasRated(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(RATED_FLAG)) === '1';
  } catch {
    return false;
  }
}

export async function setHasRated(): Promise<void> {
  try {
    await AsyncStorage.setItem(RATED_FLAG, '1');
  } catch {}
}

export async function openNativeReview(): Promise<void> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    await StoreReview.requestReview();
  } catch {}
}

/**
 * Open the store's own write-review UI directly. Unlike requestReview() this
 * has NO quota and always works — but it leaves the app (the store opens).
 * Used by the explicit Settings "Rate" button: Apple reserves the in-app
 * sheet for unprompted moments, and a deliberate user tap deserves a path
 * that always does something (and allows a written review, not just stars).
 */
export async function openStoreReviewPage(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`);
    } else {
      try {
        // Play Store app, straight to the listing (review box below the fold).
        await Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`);
      } catch {
        // No Play Store on device — fall back to the web listing.
        await Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
      }
    }
  } catch {}
}
