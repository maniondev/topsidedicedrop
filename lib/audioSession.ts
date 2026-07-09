import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_MODE_KEY = 'tm_sound_mode'; // shared with SoundContext

let _mode: 'ambient' | 'playback' = 'ambient';

// Ad-audio state — declared up here so applyCategory can honor it. While an ad
// owns the audio we force silent-switch-respecting Ambient no matter what mode
// a caller asks for, so a pool rebuild / session reactivation that fires
// mid-ad (SoundContext's foreground handler, a Control-Center pull, a
// click-through return) can never flip the session to Playback under a live
// ad and defeat the "ad audio never plays on a muted phone" guarantee.
let _adPresenting = false;
let _adEndedAt = 0;
const AD_GRACE_MS = 800;

function applyCategory(mode: 'ambient' | 'playback') {
  const effective = _adPresenting ? 'ambient' : mode;
  try {
    if (effective === 'playback') {
      Sound.setCategory('Playback', true);
    } else {
      Sound.setCategory('Ambient');
    }
    // iOS deactivates the shared AVAudioSession on backgrounding; nothing
    // else in the app calls setActive again afterward (removed from every
    // play() call by patches/react-native-sound+0.13.0.patch for perf), so
    // without this, playback silently no-ops after an app-switcher trip.
    Sound.setActive(true);
  } catch {}
}

export function setAudioMode(mode: 'ambient' | 'playback') {
  _mode = mode;
  applyCategory(mode);
}

// Two independent contexts (Sound SFX + Music) each construct a batch of
// Sound/AVAudioPlayer instances on mount. Calling the native setCategory
// bridge from both, concurrently, while either batch is mid-construction can
// disrupt in-flight player setup on iOS. This makes the FIRST-ever category
// application shared and idempotent — whichever context calls it first does
// the real native work; the other just awaits the same promise instead of
// making its own competing native call.
let ensurePromise: Promise<void> | null = null;
export function ensureAudioSessionCategory(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(SOUND_MODE_KEY);
        _mode = saved === 'playback' ? 'playback' : 'ambient';
      } catch {}
      applyCategory(_mode);
    })();
  }
  return ensurePromise;
}

export function restoreGameAudioSession(delayMs = 200) {
  setTimeout(() => {
    applyCategory(_mode);
  }, delayMs);
}

// Foregrounding (app switcher, incoming call, etc.) can leave iOS's shared
// AVAudioSession deactivated. SoundContext and MusicContext both react to
// the same 'active' AppState event and each reconstruct their own batch of
// Sound/AVAudioPlayer instances — the same concurrent-native-call race that
// ensureAudioSessionCategory() fixed for cold launch reappears here unless
// both go through one shared, awaited reactivation first. Coalesces callers
// that overlap in time into a single real native call; resets once resolved
// so the *next* foreground event runs it fresh.
let resumePromise: Promise<void> | null = null;
export function reactivateAudioSessionOnResume(): Promise<void> {
  if (!resumePromise) {
    resumePromise = (async () => {
      // iOS often rejects setActive:YES if called the instant the app
      // foregrounds, while the system transition is still in flight — and
      // the native call swallows the error, so playback then silently dies.
      // A short settle delay makes activation reliable (same reasoning as
      // restoreGameAudioSession's 200ms default).
      await new Promise(r => setTimeout(r, 200));
      applyCategory(_mode);
    })().finally(() => {
      resumePromise = null;
    });
  }
  return resumePromise;
}

// Synchronous re-apply for retry paths: if playback verifiably failed to
// start after a resume (session activation was likely rejected), callers
// re-apply the category/activation and try playing again.
export function forceReapplyAudioSessionCategory() {
  applyCategory(_mode);
}

// ── Ad audio coordination (iOS) ───────────────────────────────────────────────
// While a full-screen ad is on screen we force the silent-switch-respecting
// Ambient category — regardless of the user's "break through silent mode"
// setting — so ad audio NEVER plays on a muted phone, and we flag that an ad
// currently owns the audio. The flag lets the AppState resume handler skip its
// normal music restart while an ad is still up or was just dismissed, so a
// background→foreground trip mid-ad (click-through to the App Store, Control
// Center pull-down, incoming call, etc.) can't restart the soundtrack
// underneath the ad or fight the restore. A short grace window after dismissal
// covers the 'active' event that arrives alongside the ad closing.
export function isAdInterrupting(): boolean {
  return _adPresenting || Date.now() - _adEndedAt < AD_GRACE_MS;
}

// Call right BEFORE presenting an ad (so the category is set before the ad's
// player starts). Best-effort — never throws into the caller.
export function enterAdAudioSession() {
  _adPresenting = true;
  try {
    Sound.setCategory('Ambient');
    Sound.setActive(true);
  } catch {}
}

// Call when the ad is dismissed OR when show() failed (so we never leave the
// music paused or the category stuck on Ambient). Restores the user's real
// category after the usual settle delay and opens the grace window.
export function exitAdAudioSession() {
  _adPresenting = false;
  _adEndedAt = Date.now();
  restoreGameAudioSession();
}
