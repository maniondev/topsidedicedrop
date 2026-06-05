let runCount = 0;

/** Returns true every 4th run — show interstitial. */
export function onRunComplete(): boolean {
  runCount++;
  return runCount % 4 === 0;
}

export function refundAdSlot(): void {
  runCount--;
}
