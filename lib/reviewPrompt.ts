import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/** Should we prompt at this total-run count? (3, 13, 23, 33, …) */
export function isReviewMilestone(totalRuns: number): boolean {
  return totalRuns >= REVIEW_FIRST_AT && (totalRuns - REVIEW_FIRST_AT) % REVIEW_EVERY === 0;
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
