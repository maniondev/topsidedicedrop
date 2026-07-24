import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAudioSessionCategory, reactivateAudioSessionOnResume, forceReapplyAudioSessionCategory, isAdInterrupting } from '@/lib/audioSession';
import { isOtherAudioPlaying, addAudioInterruptionListener, addAudioRouteChangeListener } from '@/modules/native-audio-info';

const MUSIC_ENABLED_KEY = 'tm_music_enabled';
const DEV_MUSIC_INCLUDED_KEY = 'tm_dev_music_included';
const SOUNDTRACK_KEY = 'tm_soundtrack_id';

export type MusicTrack = 'menu' | 'game';

// Which SONG is loaded into the 'menu' slot — orthogonal to MusicTrack
// (which is a duck-volume level, not a track choice). All three share the
// same 130bpm tempo, so TRACK_BPM below doesn't need to vary by selection.
// ⚠️ ID↔label divergence (deliberate, do NOT "fix" by renaming IDs):
// the IDs are the values persisted in AsyncStorage and referenced by the
// theme presets, so they are FROZEN — each stays bound to its original audio
// file forever, which is what guarantees a user keeps hearing the exact track
// they picked across this relabel. Only the display labels moved:
//   id 'classic'  → file classic.m4a → now shown as "Dice Drop" (main theme)
//   id 'dicedrop' → file theme.m4a   → now shown as "Drift"     (pastel pairing)
// (The old main theme, theme.m4a, became Drift; the old Classic track,
// classic.m4a, is now the Dice Drop main theme.) When reading this file, trust
// the LABEL for what a user hears, not the id name.
export type SoundtrackId = 'dicedrop' | 'underwater' | 'classic' | 'neon' | 'forest';
// Display order: the free main theme (Dice Drop) first, then Drift, then the rest.
export const SOUNDTRACK_IDS: SoundtrackId[] = ['classic', 'dicedrop', 'forest', 'neon', 'underwater'];
export const SoundtrackMeta: Record<SoundtrackId, { label: string }> = {
  classic:    { label: 'Dice Drop' },  // file classic.m4a — main theme
  dicedrop:   { label: 'Drift' },      // file theme.m4a — airy, pastel pairing
  forest:     { label: 'Forest' },
  neon:       { label: 'Neon' },
  underwater: { label: 'Ocean' },
};
const DEFAULT_SOUNDTRACK: SoundtrackId = 'classic'; // the Dice Drop main theme
const SOUNDTRACK_SOURCES: Record<SoundtrackId, any> = {
  dicedrop:   require('@/assets/sounds/music/theme.m4a'),
  underwater: require('@/assets/sounds/music/underwater.m4a'),
  classic:    require('@/assets/sounds/music/classic.m4a'),
  neon:       require('@/assets/sounds/music/neon.m4a'),
  forest:     require('@/assets/sounds/music/forest.m4a'),
};

// Where each soundtrack's LOCKED preview begins (ms into the track), so the
// snippet a non-premium user hears can showcase its best/most recognisable
// part. 0 = play from the top. Expressed in bars for readability — every track
// is 130 BPM 4/4, so one bar is 1846.15 ms. (Bar N starts after N-1 bars.)
const BAR_MS = (60000 / 130) * 4;
const PREVIEW_START_MS: Record<SoundtrackId, number> = {
  dicedrop:   0,
  classic:    0,
  forest:     0,
  neon:       Math.round(BAR_MS * 16),   // start of bar 17
  underwater: Math.round(BAR_MS * 8),    // start of bar 9
};

// Single-track mode: gameplay.m4a is intentionally NOT required here — a
// require() would bundle its ~2MB into both store binaries and decode it
// into a player on every cold launch, and nothing plays it. Re-add the
// entry when the two-track system returns.
const LAUNCH_SOURCE = require('@/assets/sounds/music/launch.m4a');

const CROSSFADE_MS = 800;
const FADE_STEP_MS = 32;
// Single-track mode: only the menu track ever plays. "game" here just means
// the ducked volume level while in a game, not a separate track — the
// gameplay.m4a file/loading is kept around for when a second track returns.
const TRACK_VOLUME: Record<MusicTrack, number> = {
  menu: 0.12,
  game: 0.04,
};

// BPM of each source track, for syncing UI motion (e.g. the home screen logo
// swing) to the beat. 'menu' and 'game' point at the same file in
// single-track mode, so they share a tempo until gameplay.m4a is measured.
export const TRACK_BPM: Record<MusicTrack, number> = {
  menu: 130,
  game: 130,
};

function loadMusic(uri: string): Promise<{ sound: Sound; durationMs: number } | null> {
  return new Promise(resolve => {
    const snd = new Sound(uri, '', (error, props) => {
      if (error) { resolve(null); return; }
      snd.setNumberOfLoops(-1);
      try { snd.setVolume(0); } catch {}
      const seconds = props?.duration ?? snd.getDuration();
      resolve({ sound: snd, durationMs: Math.max(0, Math.round((seconds || 0) * 1000)) });
    });
  });
}

// Polls actual playback position instead of guessing a fixed startup-latency
// delay — a freshly constructed Sound's real audible start (after .play())
// varies with device/format, so this waits for genuine confirmation that
// the player has actually begun advancing before anything syncs to it.
// Resolves true once playback verifiably started, false on timeout — a
// false is the signal that the audio session wasn't actually live (e.g.
// activation rejected during an app-foreground transition) and the caller
// should re-apply the session and retry.
// Resolves with the wall-clock timestamp of the track's position 0 (a truthy
// value callers use both as "playback started" AND as the sync anchor), or 0 if
// playback never started before the timeout (the falsy "not live — retry"
// signal). Crucially, the timestamp is back-dated by however far the track has
// already advanced at first detection: a freshly loaded Sound can be ~200ms in
// before its position first reads non-zero, so anchoring beat-synced animations
// to a plain Date.now() here would plant the grid that far BEHIND the audio.
function waitForPlaybackStart(snd: Sound, timeoutMs = 500): Promise<number> {
  return new Promise(resolve => {
    const start = Date.now();
    const poll = () => {
      snd.getCurrentTime(seconds => {
        if (seconds > 0) {
          resolve(Date.now() - Math.round(seconds * 1000));
        } else if (Date.now() - start > timeoutMs) {
          resolve(0);
        } else {
          setTimeout(poll, 8);
        }
      });
    };
    poll();
  });
}

function loadOneShot(uri: string): Promise<{ sound: Sound; durationMs: number } | null> {
  return new Promise(resolve => {
    const snd = new Sound(uri, '', (error, props) => {
      if (error) { resolve(null); return; }
      const seconds = props?.duration ?? snd.getDuration();
      resolve({ sound: snd, durationMs: Math.max(0, Math.round((seconds || 0) * 1000)) });
    });
  });
}

interface MusicCtxType {
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
  // Dev-only: simulates having a music track shipped, so the split
  // Sound Effects / Music UI can be tested / toggled.
  devMusicIncluded: boolean;
  setDevMusicIncluded: (v: boolean) => void;
  playTrack: (track: MusicTrack) => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  // Restart the track from position 0 and re-anchor the beat grid. Used after
  // a full-screen ad (iOS) interrupts playback, so music and beat-synced UI
  // both resume cleanly in step instead of drifting. yieldToOtherAudio
  // (default true) skips the restart if the user's own audio is playing —
  // pass false for an explicit user action (e.g. the theme picker's Apply
  // All), which should always take effect regardless of other audio.
  restartMusicFromTop: (yieldToOtherAudio?: boolean) => void;
  // Drives the LaunchIntroOverlay (splash-matching screen + loading bar
  // shown only when the cold-launch stinger will actually play).
  launchIntroActive: boolean;
  launchPlaybackStarted: boolean;
  launchStingerDurationMs: number | null;
  // BPM of the currently active track, for syncing UI motion to the beat.
  bpm: number;
  // Increments each time the track actually restarts from position 0, so
  // BPM-synced UI motion can reset its own timers to stay locked in.
  musicSyncEpoch: number;
  // Wall-clock timestamp of that restart — lets animations that activate
  // well after the track started (idle-tier reveals) compute a phase-correct
  // schedule against the true beat grid instead of their own activation time.
  musicSyncStartedAt: number;
  // Actual duration of the looping menu track, so consumers can predict when
  // it next loops back to position 0 (musicSyncStartedAt + k * this, for the
  // smallest k landing in the future) without a native "loop" event.
  menuLoopDurationMs: number | null;
  // Wall-clock start of the CURRENT audio loop — re-anchored every wrap.
  // Beat-synced animations anchor here (not musicSyncStartedAt) so
  // animation-vs-audio drift can't accumulate across loops.
  musicLoopStartedAt: number;
  // Which song is loaded. Switching reloads the track, restarts it from 0,
  // and bumps musicSyncStartedAt/Epoch — same "fresh restart" signal as a
  // cold launch, which is what makes beat-synced UI restart in step.
  soundtrackId: SoundtrackId;
  setSoundtrack: (id: SoundtrackId) => void;
  // Preview a (locked) track from its configured offset without persisting.
  previewSoundtrack: (id: SoundtrackId) => void;
}

const MusicCtx = createContext<MusicCtxType>({
  musicEnabled: true,
  setMusicEnabled: () => {},
  devMusicIncluded: true,
  setDevMusicIncluded: () => {},
  playTrack: () => {},
  pauseMusic: () => {},
  resumeMusic: () => {},
  restartMusicFromTop: () => {},
  launchIntroActive: false,
  launchPlaybackStarted: false,
  launchStingerDurationMs: null,
  bpm: TRACK_BPM.menu,
  musicSyncEpoch: 0,
  musicSyncStartedAt: 0,
  menuLoopDurationMs: null,
  musicLoopStartedAt: 0,
  soundtrackId: DEFAULT_SOUNDTRACK,
  setSoundtrack: () => {},
  previewSoundtrack: () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabledState] = useState(true);
  // Shipped/on by default now (the soundtrack feature is rolled out, no longer
  // gated behind the dev gesture). Still toggleable; an explicit off persists.
  const [devMusicIncluded, setDevMusicIncludedState] = useState(true);
  const [soundtrackId, setSoundtrackIdState] = useState<SoundtrackId>(DEFAULT_SOUNDTRACK);
  const [tracksReady, setTracksReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  // Drives the LaunchIntroOverlay. Defaults to true (optimistic) so it
  // covers the Home screen from the very first frame — settingsReady is an
  // async AsyncStorage read, and waiting for it before showing the overlay
  // left a real gap where the raw Home screen flashed underneath before the
  // overlay ever appeared. The effect below clears it quickly once we know
  // whether the launch sequence will actually play. launchPlaybackStarted
  // flips true right as the stinger begins (so the loading bar knows when to
  // start filling), and launchIntroActive flips false once the stinger
  // finishes (theme starts) or once we know there's nothing to wait for.
  const [launchIntroActive, setLaunchIntroActive] = useState(true);
  const [launchPlaybackStarted, setLaunchPlaybackStarted] = useState(false);
  const [launchStingerDurationMs, setLaunchStingerDurationMs] = useState<number | null>(null);
  // Actual duration of the looping menu track — since it loops seamlessly
  // (setNumberOfLoops(-1), no native "loop restarted" event), this is what
  // lets consumers predict the wall-clock time of the track's next natural
  // loop-around from musicSyncStartedAt, without needing a real callback.
  const [menuLoopDurationMs, setMenuLoopDurationMs] = useState<number | null>(null);
  // Bumped every time the menu track actually restarts from position 0
  // (cold launch, or a reload after a long background) — BPM-synced UI
  // motion (logo swing, word flip) resets its own timers off this so it
  // stays locked to the beat instead of drifting from an old start point.
  const [musicSyncEpoch, setMusicSyncEpoch] = useState(0);
  // Wall-clock timestamp of the moment musicSyncEpoch last bumped. Lets any
  // consumer compute "how far into the track are we" at any later point —
  // needed for animations that activate well after the track started (e.g.
  // an idle-tier reveal) but still need to land phase-correct on the beat
  // grid, not just restart cleanly from whenever they happen to turn on.
  const [musicSyncStartedAt, setMusicSyncStartedAt] = useState(0);
  // Wall-clock timestamp of the CURRENT loop's start — re-anchored at every
  // predicted loop boundary (startedAt + k * loopDuration), not just real
  // restarts. Beat-synced animations must anchor to this, not to
  // musicSyncStartedAt: the track's real loop length (59.118s) is ~41ms
  // longer than its nominal beat-grid length (128 beats @ 130bpm =
  // 59.077s), so anchoring to the original start accumulates ~41ms of
  // animation-vs-audio drift per loop — visibly out of sync after a long
  // session. Re-anchoring each loop caps drift at one loop's worth.
  const [musicLoopStartedAt, setMusicLoopStartedAt] = useState(0);
  const enabledRef = useRef(true);
  enabledRef.current = musicEnabled;
  const devIncludedRef = useRef(true);
  devIncludedRef.current = devMusicIncluded;
  // Read by the route-change listener (a stable-callback effect) to check
  // "did sync ever actually succeed" without a stale closure.
  const musicSyncStartedAtRef = useRef(0);
  musicSyncStartedAtRef.current = musicSyncStartedAt;

  // True while the user's own audio (their music, a podcast, etc.) is playing.
  // We yield our soundtrack to it rather than layering a second music bed on
  // top. Refreshed synchronously at each point where we'd auto-start music
  // (cold launch, foreground resume, ad-close restart); a cheap native property
  // read (iOS only — always false elsewhere, preserving prior behavior). SFX
  // are unaffected and still play over the user's audio, which is expected.
  const otherAudioRef = useRef(false);
  const refreshOtherAudio = useCallback(() => {
    const v = isOtherAudioPlaying();
    otherAudioRef.current = v;
    return v;
  }, []);

  const soundsRef = useRef<Partial<Record<MusicTrack, Sound>>>({});
  const launchSoundRef = useRef<Sound | null>(null);
  const hasPlayedLaunchRef = useRef(false);
  const currentTrackRef = useRef<MusicTrack>('menu');
  const fadeIntervalsRef = useRef<Partial<Record<MusicTrack, ReturnType<typeof setInterval>>>>({});
  // True from the moment playLaunchSequence starts until the theme actually
  // starts (whether via the stinger's own completion or an abandonment —
  // see completeLaunchOnResume). Lets the foreground handler detect "we
  // backgrounded mid-stinger" and take over instead of leaving the intro
  // overlay stuck forever.
  const launchInFlightRef = useRef(false);
  // Set once the launch sequence has been taken over by completeLaunchOnResume
  // so a late-firing original stinger completion callback can't clobber it.
  const launchAbandonedRef = useRef(false);

  // Wait for BOTH persisted settings to resolve before the launch-sequence
  // effect below makes its one-time "did music start on?" decision — reading
  // them independently (racing tracksReady) could catch musicEnabled/
  // devMusicIncluded still at their defaults instead of the real persisted
  // values.
  const settingsReadyRef = useRef(false);
  settingsReadyRef.current = settingsReady;
  const tracksReadyRef = useRef(false);
  tracksReadyRef.current = tracksReady;
  // Read by the mount-time track-loading effect below so it loads the
  // correct song on the first try instead of loading the default then
  // immediately reloading — kept in sync via a plain assignment (same
  // pattern as enabledRef/devIncludedRef), which is safe here because
  // React commits state updates before effects run, so by the time the
  // loading effect's body executes this ref already reflects the value
  // set in the same settingsReady-flipping render.
  const soundtrackIdRef = useRef<SoundtrackId>(DEFAULT_SOUNDTRACK);
  soundtrackIdRef.current = soundtrackId;

  useEffect(() => {
    (async () => {
      const [enabledVal, devVal, soundtrackVal] = await Promise.all([
        AsyncStorage.getItem(MUSIC_ENABLED_KEY).catch(() => null),
        AsyncStorage.getItem(DEV_MUSIC_INCLUDED_KEY).catch(() => null),
        AsyncStorage.getItem(SOUNDTRACK_KEY).catch(() => null),
      ]);
      if (enabledVal === '0') setMusicEnabledState(false);
      if (devVal === '0') setDevMusicIncludedState(false); // default on; honor explicit off
      if (soundtrackVal && SOUNDTRACK_IDS.includes(soundtrackVal as SoundtrackId)) {
        setSoundtrackIdState(soundtrackVal as SoundtrackId);
        soundtrackIdRef.current = soundtrackVal as SoundtrackId;
      }
      setSettingsReady(true);
    })();
  }, []);

  // Unconditional escape hatch for the pre-settingsReady phase: the overlay
  // starts visible for EVERY user, and normally the settings read resolves
  // in well under a second and the effect below takes over. But if that read
  // ever hangs or something throws before settingsReady flips, nothing else
  // would clear the overlay — the app would be permanently covered. (The
  // 8s safety below only arms after settingsReady, on the music path.)
  useEffect(() => {
    const failsafe = setTimeout(() => {
      if (!settingsReadyRef.current) setLaunchIntroActive(false);
    }, 4000);
    return () => clearTimeout(failsafe);
  }, []);

  // The overlay starts shown by default (see launchIntroActive's declaration)
  // to cover the very first frame. Once settingsReady resolves we know
  // whether cold-launch music will actually play: if not, drop the overlay
  // immediately; if so, keep it up with a safety timeout that force-clears
  // it if something goes wrong (e.g. asset load failure), so the app never
  // gets stuck behind it.
  useEffect(() => {
    if (!settingsReady) return;
    if (!musicEnabled || !devMusicIncluded || hasPlayedLaunchRef.current) {
      setLaunchIntroActive(false);
      return;
    }
    setLaunchIntroActive(true);
    const safety = setTimeout(() => setLaunchIntroActive(false), 8000);
    return () => clearTimeout(safety);
  }, [settingsReady, musicEnabled, devMusicIncluded]);

  // Load the selected soundtrack + the one-shot launch stinger once settings
  // (including which soundtrack is selected) are known — waiting the extra
  // beat avoids loading the default song and then immediately reloading.
  useEffect(() => {
    if (!settingsReady) return;
    let cancelled = false;
    (async () => {
      await ensureAudioSessionCategory();
      if (cancelled) return;
      const [menuSnd, launchSnd] = await Promise.all([
        (async () => {
          const asset = Asset.fromModule(SOUNDTRACK_SOURCES[soundtrackIdRef.current]);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          return loadMusic(uri);
        })(),
        (async () => {
          const asset = Asset.fromModule(LAUNCH_SOURCE);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          return loadOneShot(uri);
        })(),
      ]);
      if (cancelled) return;
      if (menuSnd) {
        soundsRef.current.menu = menuSnd.sound;
        setMenuLoopDurationMs(menuSnd.durationMs);
      }
      if (launchSnd) {
        launchSoundRef.current = launchSnd.sound;
        setLaunchStingerDurationMs(launchSnd.durationMs);
      }
      setTracksReady(true);
    })();
    return () => {
      cancelled = true;
      Object.values(fadeIntervalsRef.current).forEach(id => id && clearInterval(id));
      Object.values(soundsRef.current).forEach(s => { try { s.stop(); s.release(); } catch {} });
      try { launchSoundRef.current?.stop(); launchSoundRef.current?.release(); } catch {}
    };
  }, [settingsReady]);

  const clearFade = (track: MusicTrack) => {
    const id = fadeIntervalsRef.current[track];
    if (id) { clearInterval(id); fadeIntervalsRef.current[track] = undefined; }
  };

  const fadeTo = useCallback((track: MusicTrack, target: number, onDone?: () => void) => {
    const snd = soundsRef.current[track];
    if (!snd) { onDone?.(); return; }
    clearFade(track);
    const steps = Math.max(1, Math.round(CROSSFADE_MS / FADE_STEP_MS));
    let step = 0;
    // @ts-ignore — react-native-sound doesn't expose a getter; track our own last-set volume via closure start point
    const start = (snd as any)._lastVolume ?? (target > 0 ? 0 : TRACK_VOLUME[track]);
    fadeIntervalsRef.current[track] = setInterval(() => {
      step++;
      const t = Math.min(1, step / steps);
      const vol = start + (target - start) * t;
      try { snd.setVolume(vol); } catch {}
      (snd as any)._lastVolume = vol;
      if (t >= 1) {
        clearFade(track);
        onDone?.();
      }
    }, FADE_STEP_MS);
  }, []);

  // Cold-launch only: play the one-shot launch stinger to completion, THEN
  // start the menu track at full volume — no fade in, unlike every other
  // transition (including returning from background, which still fades).
  // Sequential (stinger finishes before theme starts), not simultaneous.
  const playLaunchSequence = useCallback(() => {
    hasPlayedLaunchRef.current = true;
    currentTrackRef.current = 'menu';
    if (!enabledRef.current || !devIncludedRef.current) {
      setLaunchIntroActive(false);
      return;
    }

    launchInFlightRef.current = true;
    launchAbandonedRef.current = false;

    // Cold launch: force the AVAudioSession active+categorized right before
    // playing. The mount-time ensureAudioSessionCategory() may not have fully
    // taken effect yet — most visibly on the iOS Simulator — and playing into
    // an inactive session silently no-ops (the "no launch sound / no music
    // until I toggle Break Through Silent Mode or trigger a SFX" bug: both of
    // those just happen to re-activate the session). This is the same
    // reactivation those actions do, done proactively.
    forceReapplyAudioSessionCategory();

    const startTheme = async () => {
      // A background/foreground trip mid-stinger may have already handed
      // this off to completeLaunchOnResume — don't clobber that.
      if (launchAbandonedRef.current) return;
      launchInFlightRef.current = false;
      // User muted music while the stinger was playing — respect it rather
      // than starting the theme against the toggle they just set.
      if (!enabledRef.current || !devIncludedRef.current) {
        setLaunchPlaybackStarted(false);
        setLaunchIntroActive(false);
        return;
      }
      const theme = soundsRef.current.menu;
      if (theme) {
        clearFade('menu');
        const playTheme = () => {
          try {
            theme.setCurrentTime(0);
            theme.setVolume(TRACK_VOLUME.menu);
            theme.play();
          } catch {}
          (theme as any)._lastVolume = TRACK_VOLUME.menu;
        };
        playTheme();
        let started = await waitForPlaybackStart(theme);
        if (!started) {
          // Session still wasn't live — re-activate and try once more, the
          // same recovery the resume paths use.
          forceReapplyAudioSessionCategory();
          playTheme();
          started = await waitForPlaybackStart(theme);
        }
        if (started) {
          setMusicSyncStartedAt(started);
          setMusicSyncEpoch(e => e + 1);
        }
      }
      // Theme has started — the intro overlay's job is done.
      setLaunchIntroActive(false);
    };

    const launch = launchSoundRef.current;
    if (launch) {
      try {
        // Match the menu soundtrack's level (was a hardcoded 0.3 — 2.5x
        // louder than the theme it hands off to). Tied to TRACK_VOLUME.menu
        // so retuning the menu volume keeps the stinger→theme handoff even.
        launch.setVolume(TRACK_VOLUME.menu);
        setLaunchPlaybackStarted(true);
        launch.play(() => startTheme());
        // Verify the stinger actually began; if it didn't (inactive session
        // on cold launch), re-activate and replay it once. If it still won't
        // start, the play() completion callback drives startTheme, which has
        // its own retry — so the music recovers either way.
        (async () => {
          const started = await waitForPlaybackStart(launch, 400);
          if (!started && launchInFlightRef.current && !launchAbandonedRef.current) {
            forceReapplyAudioSessionCategory();
            try { launch.setCurrentTime(0); launch.play(() => startTheme()); } catch {}
          }
        })();
      } catch {
        startTheme();
      }
    } else {
      // No stinger loaded — nothing for the overlay to show a bar for.
      startTheme();
    }
  }, []);

  // Self-heal a yield to "other audio": AVAudioSession.isOtherAudioPlaying can
  // read a phantom true (a stale/transitioning session), which used to silence
  // music until the NEXT foreground event — i.e. it never came back after
  // backgrounding, or didn't start on launch. After any yield we re-check a few
  // times; if the reading has cleared (no real other audio) we start music.
  // Bounded so we don't spin while the user genuinely has Spotify going, and
  // reset on a fresh background/foreground cycle.
  const reloadMenuTrackRef = useRef<(() => void) | null>(null);
  const yieldRecheckRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; tries: number }>({ timer: null, tries: 0 });
  const resetYieldRecheck = useCallback(() => {
    const s = yieldRecheckRef.current;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    s.tries = 0;
  }, []);
  const scheduleYieldRecheck = useCallback(() => {
    const s = yieldRecheckRef.current;
    if (s.timer || s.tries >= 4) return;
    s.timer = setTimeout(() => {
      s.timer = null;
      if (AppState.currentState !== 'active' || isAdInterrupting()) return;
      if (!enabledRef.current || !devIncludedRef.current) return;
      if (musicSyncStartedAtRef.current) { s.tries = 0; return; } // already playing
      s.tries++;
      reloadMenuTrackRef.current?.();
    }, 2000);
  }, []);

  // Backgrounding mid-stinger (app switcher during the launch intro) can
  // leave playLaunchSequence's stinger playback stuck/interrupted — its
  // completion callback may never fire, so launchIntroActive would never
  // clear and the overlay hangs forever over a theme that never started.
  // On foreground, if a launch sequence is still in flight, abandon the
  // stinger and jump straight to a fresh theme start.
  const completeLaunchOnResume = useCallback(async () => {
    launchAbandonedRef.current = true;
    launchInFlightRef.current = false;
    try { launchSoundRef.current?.stop(); } catch {}
    // Claim a generation like the other reload paths, so rapid background/
    // foreground flapping can't run this concurrently with reloadMenuTrack and
    // leave two menu Sound instances playing (one leaked). Claimed BEFORE the
    // other-audio check below so yielding also cancels any in-flight reload.
    const gen = ++reloadGenRef.current;
    // Reactivate the audio session BEFORE checking for other audio — reading
    // isOtherAudioPlaying mid-transition returns phantom values. Our mixable
    // category doesn't interrupt the user's playback, so this is safe.
    await reactivateAudioSessionOnResume();
    if (gen !== reloadGenRef.current) { setLaunchPlaybackStarted(false); setLaunchIntroActive(false); return; }
    // Yield to the user's own audio — the stinger is abandoned and the overlay
    // cleared regardless, but don't start our soundtrack over their playback.
    // Re-check shortly after in case the reading was a transient false positive.
    if (refreshOtherAudio()) {
      setLaunchPlaybackStarted(false);
      setLaunchIntroActive(false);
      scheduleYieldRecheck();
      return;
    }
    const old = soundsRef.current.menu;
    try { old?.stop(); old?.release(); } catch {}
    const asset = Asset.fromModule(SOUNDTRACK_SOURCES[soundtrackIdRef.current]);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    const loaded = await loadMusic(uri);
    if (loaded) {
      const { sound: snd, durationMs } = loaded;
      if (gen !== reloadGenRef.current) { try { snd.release(); } catch {} setLaunchPlaybackStarted(false); setLaunchIntroActive(false); return; }
      soundsRef.current.menu = snd;
      setMenuLoopDurationMs(durationMs);
      snd.setVolume(TRACK_VOLUME.menu);
      snd.play();
      (snd as any)._lastVolume = TRACK_VOLUME.menu;
      let started = await waitForPlaybackStart(snd);
      if (!started && AppState.currentState === 'active') {
        // Same session-activation-rejected-on-foreground case as
        // reloadMenuTrack — re-apply and retry once.
        forceReapplyAudioSessionCategory();
        try { snd.play(); } catch {}
        started = await waitForPlaybackStart(snd);
      }
      if (started && gen === reloadGenRef.current) {
        setMusicSyncStartedAt(started);
        setMusicSyncEpoch(e => e + 1);
      }
    }
    setLaunchPlaybackStarted(false);
    setLaunchIntroActive(false);
  }, [refreshOtherAudio, scheduleYieldRecheck]);

  // Single-track mode: "switching" tracks just ducks/restores the one menu
  // track's volume — no pause, no restart, no second track ever plays.
  const playTrack = useCallback((track: MusicTrack) => {
    currentTrackRef.current = track;
    if (!enabledRef.current || !devIncludedRef.current) return;

    const menuSound = soundsRef.current.menu;
    if (!menuSound) return;

    menuSound.getCurrentTime((_seconds, isPlaying) => {
      if (!isPlaying) menuSound.play();
    });
    fadeTo('menu', TRACK_VOLUME[track]);
  }, [fadeTo]);

  // Kept for later (currently unused — the pause modal no longer pauses
  // music). Fixed to always target the single active menu sound.
  const pauseMusic = useCallback(() => {
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    try { snd.pause(); } catch {}
  }, []);

  const resumeMusic = useCallback(() => {
    if (!enabledRef.current || !devIncludedRef.current) return;
    const snd = soundsRef.current.menu;
    if (!snd) return;
    snd.play();
    fadeTo('menu', TRACK_VOLUME[currentTrackRef.current]);
  }, [fadeTo]);

  // A Sound instance that's been paused for a long background stretch can
  // come back with a dead underlying AVAudioPlayer (iOS reclaims audio
  // resources under memory pressure while suspended) — .play() then no-ops
  // silently. SoundContext sidesteps this by fully rebuilding its SFX pool
  // on every foreground event; do the same here for the menu track rather
  // than reusing the possibly-stale instance.
  // Guards against overlapping reloads from rapid background/foreground
  // flapping (app-switcher peeks fire inactive→active in quick succession):
  // each reload takes a generation number, and any await-crossing that
  // discovers a newer generation abandons its work.
  const reloadGenRef = useRef(0);

  const reloadMenuTrack = useCallback(async () => {
    const gen = ++reloadGenRef.current;
    // Reactivate the audio session BEFORE reading isOtherAudioPlaying. Reading
    // that property mid-foreground-transition (session still stale) returned
    // phantom values that silently kept music from ever restarting after
    // backgrounding — the bug this fixes. Our category is always set with
    // mixWithOthers, so reactivating never interrupts the user's own audio.
    // (Also shared with SoundContext's foreground handler: it waits out
    // whichever context's native setCategory/setActive is in flight, avoiding
    // the concurrent-construction race that once broke cold-launch playback.)
    await reactivateAudioSessionOnResume();
    if (gen !== reloadGenRef.current) return;
    // Yield to the user's own audio — don't rebuild/restart our soundtrack over
    // it. The gen bump above cancels any reload already in flight. On yield,
    // re-check shortly after in case the reading was a transient false positive
    // (rather than waiting for the next foreground event, which left music dead).
    if (refreshOtherAudio()) { scheduleYieldRecheck(); return; }
    const old = soundsRef.current.menu;
    try { old?.stop(); old?.release(); } catch {}
    const asset = Asset.fromModule(SOUNDTRACK_SOURCES[soundtrackIdRef.current]);
    await asset.downloadAsync(); // already local; just resolves the cached uri
    const uri = asset.localUri || asset.uri;
    const loaded = await loadMusic(uri);
    if (!loaded) return;
    const { sound: snd, durationMs } = loaded;
    if (gen !== reloadGenRef.current) {
      // A newer resume superseded this one mid-load — discard quietly.
      try { snd.release(); } catch {}
      return;
    }
    soundsRef.current.menu = snd;
    setMenuLoopDurationMs(durationMs);
    if (AppState.currentState !== 'active') {
      // App re-backgrounded while we were loading — keep the fresh instance
      // for the next resume, but don't start playback into the background.
      return;
    }
    snd.play();
    fadeTo('menu', TRACK_VOLUME[currentTrackRef.current]);
    let started = await waitForPlaybackStart(snd);
    if (!started && gen === reloadGenRef.current && AppState.currentState === 'active') {
      // Playback verifiably didn't start — iOS most likely rejected the
      // session activation during the foreground transition. Re-apply the
      // session and try once more; this is the case that used to require
      // the user to background/foreground a second time by hand.
      forceReapplyAudioSessionCategory();
      try { snd.play(); } catch {}
      started = await waitForPlaybackStart(snd);
    }
    if (gen !== reloadGenRef.current) return;
    if (started) {
      resetYieldRecheck(); // music is up — cancel any pending yield re-check
      setMusicSyncStartedAt(started);
      setMusicSyncEpoch(e => e + 1);
    }
  }, [fadeTo, refreshOtherAudio, scheduleYieldRecheck, resetYieldRecheck]);
  // Ref so scheduleYieldRecheck can call the latest reloadMenuTrack without a
  // circular useCallback dependency.
  reloadMenuTrackRef.current = reloadMenuTrack;

  // User picked a different song in Settings. Shares reloadGenRef with
  // reloadMenuTrack so a soundtrack switch mid-resume (or vice versa) can't
  // race — whichever started last wins, the other discards its load. Always
  // bumps musicSyncStartedAt/Epoch on success, same "fresh restart" signal
  // as a cold launch, which is what makes beat-synced UI restart together.
  const setSoundtrack = useCallback((id: SoundtrackId) => {
    if (id === soundtrackIdRef.current) return;
    soundtrackIdRef.current = id;
    setSoundtrackIdState(id);
    AsyncStorage.setItem(SOUNDTRACK_KEY, id).catch(() => {});
    if (!devIncludedRef.current || !tracksReadyRef.current) return;

    // Load the new track into the slot regardless of the on/off toggle — so
    // switching while music is OFF still swaps the actual file, and a later
    // toggle-on plays the right song. Only start playback + re-anchor the
    // beat grid when music is currently on.
    const shouldPlay = enabledRef.current;
    const gen = ++reloadGenRef.current;
    (async () => {
      const old = soundsRef.current.menu;
      try { old?.stop(); old?.release(); } catch {}
      const asset = Asset.fromModule(SOUNDTRACK_SOURCES[id]);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      const loaded = await loadMusic(uri);
      if (!loaded) return;
      const { sound: snd, durationMs } = loaded;
      if (gen !== reloadGenRef.current) {
        try { snd.release(); } catch {}
        return;
      }
      soundsRef.current.menu = snd;
      setMenuLoopDurationMs(durationMs);
      if (!shouldPlay) return; // loaded (volume 0, paused) — ready for toggle-on
      // No fade — picking a new soundtrack should play it immediately at
      // full volume, unlike other transitions (resume, duck) which fade.
      const vol = TRACK_VOLUME[currentTrackRef.current];
      snd.setVolume(vol);
      snd.play();
      (snd as any)._lastVolume = vol;
      const started = await waitForPlaybackStart(snd);
      if (gen !== reloadGenRef.current || !started) return;
      setMusicSyncStartedAt(started);
      setMusicSyncEpoch(e => e + 1);
    })();
  }, []);

  // Preview a (usually locked) soundtrack from its configured "best part"
  // offset. Like setSoundtrack but (a) never persists the pick — the picker
  // reverts to the owned track on exit — and (b) seeks to PREVIEW_START_MS
  // before playing, so each track can showcase a different section.
  const previewSoundtrack = useCallback((id: SoundtrackId) => {
    soundtrackIdRef.current = id;
    setSoundtrackIdState(id);
    if (!devIncludedRef.current || !tracksReadyRef.current) return;
    const startSec = Math.max(0, (PREVIEW_START_MS[id] ?? 0) / 1000);
    const gen = ++reloadGenRef.current;
    (async () => {
      const old = soundsRef.current.menu;
      try { old?.stop(); old?.release(); } catch {}
      const asset = Asset.fromModule(SOUNDTRACK_SOURCES[id]);
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;
      const loaded = await loadMusic(uri);
      if (!loaded) return;
      const { sound: snd, durationMs } = loaded;
      if (gen !== reloadGenRef.current) { try { snd.release(); } catch {} return; }
      soundsRef.current.menu = snd;
      setMenuLoopDurationMs(durationMs);
      if (!enabledRef.current) return;
      const vol = TRACK_VOLUME[currentTrackRef.current];
      try { if (startSec > 0) snd.setCurrentTime(startSec); } catch {}
      snd.setVolume(vol);
      snd.play();
      (snd as any)._lastVolume = vol;
      const started = await waitForPlaybackStart(snd);
      if (gen !== reloadGenRef.current || !started) return;
      setMusicSyncStartedAt(started);
      setMusicSyncEpoch(e => e + 1);
    })();
  }, []);

  // Pause music the instant the app leaves the foreground (home button, app
  // switcher, incoming call, etc.) and resume the current track on return —
  // otherwise it keeps playing in the background regardless of audio-session
  // category, which isn't the intended behavior for game music.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // Cold-launch startup belongs to the launch-sequence effect, NOT
        // this handler. iOS fires an 'active' AppState event during app
        // startup (and permission dialogs like ATT/consent flap
        // inactive->active on top of that) — before the one-time launch
        // decision has run, that early event used to fall through to
        // reloadMenuTrack(), starting the theme UNDER the launch stinger
        // and double-playing on every cold start. (Same reason
        // app/_layout.tsx skips its own first 'active' event.)
        if (!hasPlayedLaunchRef.current) return;
        // A full-screen ad backgrounds the app, then foregrounds it again when
        // dismissed (and on any click-through/Control-Center trip mid-ad). Do
        // NOT restart the music here while an ad owns the audio, or just after
        // it closed — the ad's own CLOSED handler restores and restarts the
        // track once (see useInterstitialAd/useRewardedAd). Without this, the
        // music would restart underneath a still-open ad or double-restart.
        if (isAdInterrupting()) return;
        if (enabledRef.current && devIncludedRef.current) {
          if (launchInFlightRef.current) {
            completeLaunchOnResume();
          } else {
            reloadMenuTrack();
          }
        }
      } else {
        // Fresh background/foreground cycle — cancel any pending yield re-check
        // and reset its attempt budget so the next resume gets a clean run.
        resetYieldRecheck();
        // Also silence an in-flight launch stinger — it's a separate Sound
        // from the tracks below, and with the Playback category it would
        // otherwise keep playing audibly in the background. The foreground
        // handler's completeLaunchOnResume path takes over from here.
        if (launchInFlightRef.current) {
          try { launchSoundRef.current?.pause(); } catch {}
        }
        (Object.keys(soundsRef.current) as MusicTrack[]).forEach(track => {
          const snd = soundsRef.current[track];
          if (!snd) return;
          clearFade(track);
          try { snd.pause(); } catch {}
        });
      }
    });
    return () => sub.remove();
  }, [fadeTo, reloadMenuTrack, completeLaunchOnResume, resetYieldRecheck]);

  // Audio-session interruptions (alarms, timers, Siri, calls). These can fire
  // with NO AppState change — a banner alarm leaves the app 'active' — so the
  // foreground handler above never runs and the music used to die silently
  // until some later event happened to reactivate the session, with the
  // beat-synced animations left anchored to a stale epoch. Mirror the
  // AppState handler: pause everything when the interruption begins; when it
  // ends, run the same restart path (fresh Sound, session reactivation with
  // retry, epoch re-anchor) so music AND animations come back together.
  // If the interruption DID background the app (calls), the AppState guards
  // here defer to the foreground handler — exactly one restart runs.
  useEffect(() => {
    const sub = addAudioInterruptionListener(e => {
      if (e.type === 'began') {
        if (launchInFlightRef.current) {
          try { launchSoundRef.current?.pause(); } catch {}
        }
        (Object.keys(soundsRef.current) as MusicTrack[]).forEach(track => {
          const snd = soundsRef.current[track];
          if (!snd) return;
          clearFade(track);
          try { snd.pause(); } catch {}
        });
        return;
      }
      // ended
      if (AppState.currentState !== 'active') return; // foreground handler owns it
      if (!hasPlayedLaunchRef.current) return;        // cold launch owns it
      // The 'ended' notification arrives WHILE the interrupter's audio is
      // still tearing down — isOtherAudioPlaying reports true for the alarm
      // ITSELF at that instant, so restarting immediately made the reload
      // yield to audio that was already gone and music stayed dead (until
      // some later restart, e.g. leaving the game screen). Wait out the
      // teardown, re-check every guard that can change during the wait, then
      // reload — whose own fresh isOtherAudioPlaying check now sees the true
      // post-alarm state (a genuinely-playing Spotify still yields).
      setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        if (isAdInterrupting()) return;
        if (!enabledRef.current || !devIncludedRef.current) return;
        if (launchInFlightRef.current) {
          completeLaunchOnResume();
        } else {
          reloadMenuTrack();
        }
      }, 700);
    });
    return () => sub.remove();
  }, [reloadMenuTrack, completeLaunchOnResume]);

  // Audio ROUTE changes (Bluetooth connect/disconnect — AirPods — wired
  // headphones, CarPlay). Route negotiation, especially Bluetooth, can take
  // longer than waitForPlaybackStart's fixed timeout windows: audio may end
  // up playing fine a moment later, but musicSyncStartedAt/Epoch — which only
  // get set on a CONFIRMED start — silently never update, leaving beat-synced
  // animations stuck at idle tier 0 (and switching soundtracks doesn't fix it
  // either, since setSoundtrack has the same confirmed-start gate). Previously
  // this only self-healed by luck, whenever some unrelated event next
  // triggered a successful reload — e.g. removing the headset again, which
  // made the bug look like it "fixed itself."
  //
  // Unlike the interruption-ended handler, this does NOT unconditionally
  // restart the track — most route changes happen while music is already
  // playing fine, and forcibly restarting it would be an audible regression
  // (e.g. plugging in headphones mid-song). Instead: wait for the route to
  // settle, then VERIFY — only reload if playback actually isn't running, or
  // sync never successfully completed in the first place.
  useEffect(() => {
    const sub = addAudioRouteChangeListener(() => {
      if (AppState.currentState !== 'active') return; // foreground handler owns it
      if (!hasPlayedLaunchRef.current) return;         // cold launch owns it
      setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        if (isAdInterrupting()) return;
        if (!enabledRef.current || !devIncludedRef.current) return;
        if (launchInFlightRef.current) { completeLaunchOnResume(); return; }
        const snd = soundsRef.current.menu;
        if (!snd) return;
        snd.getCurrentTime((_seconds, isPlaying) => {
          if (!isPlaying || !musicSyncStartedAtRef.current) reloadMenuTrack();
        });
      }, 500);
    });
    return () => sub.remove();
  }, [reloadMenuTrack, completeLaunchOnResume]);

  // Plain on/off mute toggles (Settings, home screen, pause menu) are instant
  // — no fade — since they're a mute switch, not a track transition. The
  // very first activation of a session (cold launch, or the first time the
  // dev flag/toggle is flipped on) instead goes through the launch-sequence
  // effect below; these setters skip playback in that case and let the
  // effect handle it (stinger + unfaded start).
  // Turning music off while the launch stinger is still playing must kill
  // the stinger too — the menu-track pause below doesn't touch it, and its
  // completion callback would otherwise start the theme against the toggle.
  const stopInFlightLaunch = () => {
    if (!launchInFlightRef.current) return;
    launchAbandonedRef.current = true;
    launchInFlightRef.current = false;
    try { launchSoundRef.current?.stop(); } catch {}
    setLaunchPlaybackStarted(false);
    setLaunchIntroActive(false);
  };

  // Re-enabling music restarts the loop from the TOP and re-anchors the beat
  // grid, rather than resuming from the paused position. While music is off
  // the wall-clock animation grid keeps advancing, so a resume-from-pause
  // would leave the track behind the animations (out of sync). Starting
  // fresh and bumping the sync epoch keeps everything locked together.
  const restartMenuFromTop = () => {
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    const vol = TRACK_VOLUME[currentTrackRef.current];
    try {
      snd.setCurrentTime(0);
      snd.setVolume(vol);
      snd.play();
    } catch {}
    (snd as any)._lastVolume = vol;
    waitForPlaybackStart(snd).then(async started => {
      if (!enabledRef.current || !devIncludedRef.current) return;
      if (!started && AppState.currentState === 'active') {
        // This runs on ad close (via endAdAudio), racing the 200ms-delayed
        // category restore from exitAdAudioSession — if activation isn't live
        // yet the play() no-ops and music stays dead until the next
        // background/foreground. Re-apply + replay once, like every other
        // (re)load path.
        forceReapplyAudioSessionCategory();
        try { snd.setCurrentTime(0); snd.setVolume(vol); snd.play(); } catch {}
        started = await waitForPlaybackStart(snd);
      }
      if (started) {
        setMusicSyncStartedAt(started);
        setMusicSyncEpoch(e => e + 1);
      }
    });
  };

  // Stable public wrapper over restartMenuFromTop (which is redefined each
  // render). Consumers like the ad hooks can hold this in a ref without
  // churning their one-time event listeners, and it's safe to memoize in the
  // context value below.
  const restartMenuFromTopRef = useRef(restartMenuFromTop);
  restartMenuFromTopRef.current = restartMenuFromTop;
  // yieldToOtherAudio defaults to true — the original ad-close callers
  // (rewarded/interstitial) auto-resume music the player didn't explicitly
  // ask for right now, so it's correct for them to stay out of the way if
  // the player started their own audio during the ad. The theme picker's
  // "Apply All" is a different case: an EXPLICIT user action (same as
  // picking a soundtrack directly, which never yields) — pass false there.
  // Without this distinction, Apply All silently did nothing whenever
  // isOtherAudioPlaying() read true (a known-flaky AVAudioSession property
  // over Bluetooth routes — can get stuck reflecting a stale/phantom media
  // session), with no restart, no epoch bump, and animations left frozen.
  const restartMusicFromTop = useCallback((yieldToOtherAudio: boolean = true) => {
    // No-op when music is off/not included — restartMenuFromTop calls play()
    // unconditionally, so without this guard an ad closing would start music
    // the user has disabled.
    if (!enabledRef.current || !devIncludedRef.current) return;
    if (yieldToOtherAudio && refreshOtherAudio()) return;
    restartMenuFromTopRef.current();
  }, [refreshOtherAudio]);

  const setMusicEnabled = useCallback((v: boolean) => {
    setMusicEnabledState(v);
    AsyncStorage.setItem(MUSIC_ENABLED_KEY, v ? '1' : '0').catch(() => {});
    if (!v) {
      stopInFlightLaunch();
      // Clear the stale sync timestamp so idle-tier-gated UI (stats pulse,
      // title fly, divider comets) actually stops instead of continuing to
      // animate off a "restart" that happened before music was turned off —
      // the constant logo/word animations fall back to free-running with no
      // music, which is the intended "only those two" behavior.
      setMusicSyncStartedAt(0);
    }
    if (!devIncludedRef.current) return;
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    if (v) {
      if (hasPlayedLaunchRef.current) restartMenuFromTop();
    } else {
      try { snd.pause(); } catch {}
    }
  }, []);

  const setDevMusicIncluded = useCallback((v: boolean) => {
    setDevMusicIncludedState(v);
    AsyncStorage.setItem(DEV_MUSIC_INCLUDED_KEY, v ? '1' : '0').catch(() => {});
    if (!v) {
      stopInFlightLaunch();
      // Same reset as setMusicEnabled(false) — see comment there.
      setMusicSyncStartedAt(0);
    }
    if (!enabledRef.current) return;
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    if (v) {
      if (hasPlayedLaunchRef.current) restartMenuFromTop();
    } else {
      try { snd.pause(); } catch {}
    }
  }, []);

  // Fires exactly once per session, right when cold-launch conditions are
  // fully known (tracks loaded + persisted settings resolved). If music was
  // actually on at that moment, play the launch stinger + unfaded start.
  // Either way, mark the decision as made — so if music happened to be OFF
  // at launch, a later manual toggle-on is treated as a normal instant
  // enable, not a replay of the launch sequence.
  useEffect(() => {
    if (tracksReady && settingsReady && !hasPlayedLaunchRef.current) {
      hasPlayedLaunchRef.current = true;
      if (musicEnabled && devMusicIncluded) {
        // Yield to the user's own audio: if something is already playing, skip
        // the launch stinger + soundtrack and just drop the intro overlay. A
        // re-check shortly after covers a transient false-positive reading (why
        // music "sometimes doesn't start on launch"); it starts the theme via
        // reloadMenuTrack (hasPlayedLaunchRef is already set, so no stinger).
        if (refreshOtherAudio()) {
          setLaunchPlaybackStarted(false);
          setLaunchIntroActive(false);
          scheduleYieldRecheck();
        } else {
          playLaunchSequence();
        }
      }
    }
  }, [tracksReady, settingsReady, musicEnabled, devMusicIncluded, playLaunchSequence, refreshOtherAudio, scheduleYieldRecheck]);

  // Loop-boundary ticker: fires at each predicted wrap of the looping menu
  // track, re-anchoring musicLoopStartedAt so beat-synced animations reset
  // in step with the actual audio loop instead of drifting (see the state's
  // declaration comment). Re-runs whenever the track genuinely restarts
  // (musicSyncStartedAt changes), which also re-anchors after resumes.
  // While the app is backgrounded the audio is paused but this wall-clock
  // ticker keeps running — that's fine: animations are suspended in the
  // background, and every foreground resume reloads the track and resets
  // musicSyncStartedAt anyway.
  useEffect(() => {
    if (!musicSyncStartedAt || !menuLoopDurationMs) {
      setMusicLoopStartedAt(0);
      return;
    }
    setMusicLoopStartedAt(musicSyncStartedAt);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = () => {
      const now = Date.now();
      const k = Math.floor((now - musicSyncStartedAt) / menuLoopDurationMs) + 1;
      const next = musicSyncStartedAt + k * menuLoopDurationMs;
      timer = setTimeout(() => {
        setMusicLoopStartedAt(next);
        scheduleNext();
      }, Math.max(0, next - now));
    };
    scheduleNext();
    return () => { if (timer) clearTimeout(timer); };
  }, [musicSyncStartedAt, menuLoopDurationMs]);

  const value = useMemo(
    () => ({
      musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic,
      restartMusicFromTop,
      launchIntroActive, launchPlaybackStarted, launchStingerDurationMs,
      bpm: TRACK_BPM.menu, musicSyncEpoch, musicSyncStartedAt, menuLoopDurationMs, musicLoopStartedAt,
      soundtrackId, setSoundtrack, previewSoundtrack,
    }),
    [
      musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic,
      restartMusicFromTop,
      launchIntroActive, launchPlaybackStarted, launchStingerDurationMs, musicSyncEpoch, musicSyncStartedAt,
      menuLoopDurationMs, musicLoopStartedAt, soundtrackId, setSoundtrack,
    ],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  return useContext(MusicCtx);
}
