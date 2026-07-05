import { useEffect, useState } from 'react';
import { useMusic } from '@/contexts/MusicContext';

// Bars-elapsed-since-epoch thresholds for each escalation tier. Tier 0 is
// the baseline (nothing happening yet); tier N activates once IDLE_TIER_BARS[N-1]
// bars have played since epoch.
const IDLE_TIER_BARS = [8, 16];

// Tiers flip this far BEFORE their bar boundary. The animations they gate
// all pre-arm their first event against the absolute beat grid, so they
// need the activation signal ahead of the downbeat — flipping exactly at
// the boundary (via an already-late JS timer) meant the first pulse/sweep
// started late or was skipped entirely. Nothing renders early: the armed
// animations still wait for their precise on-grid start times.
const TIER_LEAD_MS = 250;

// Anchored to an explicit epoch (rather than always the track's raw restart
// timestamp) so a caller can give the escalation a fresh reset point — e.g.
// the Home screen resets this to the track's next natural loop-around after
// a game, instead of reusing a start time from hours ago. Also keeps a tier
// that activates well into the song phase-correct with anything else keyed
// off the same beat grid (e.g. per-beat pulse animations sharing the epoch).
export function useMusicIdleTier(epoch: number): number {
  const { bpm } = useMusic();
  const [tier, setTier] = useState(0);

  useEffect(() => {
    setTier(0);
    if (!epoch) return;
    const barMs = (60000 / bpm) * 4;
    const now = Date.now();
    const timers = IDLE_TIER_BARS.map((bars, i) => {
      const targetTime = epoch + bars * barMs - TIER_LEAD_MS;
      const delay = Math.max(0, targetTime - now);
      return setTimeout(() => setTier(i + 1), delay);
    });
    return () => timers.forEach(clearTimeout);
  }, [bpm, epoch]);

  return tier;
}
