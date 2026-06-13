import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPTOUT_FLAG = 'tm_review_optout';
const LAST_FLAG   = 'tm_review_last';

export const REVIEW_FIRST_AT = 5;
export const REVIEW_EVERY    = 15;

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

/** Should we prompt at this total-run count? (5, 20, 35, 50, …) */
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

export async function openNativeReview(): Promise<void> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    await StoreReview.requestReview();
  } catch {}
}
