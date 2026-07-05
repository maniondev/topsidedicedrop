import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAudioSessionCategory, reactivateAudioSessionOnResume } from '@/lib/audioSession';

const MUSIC_ENABLED_KEY = 'tm_music_enabled';
const DEV_MUSIC_INCLUDED_KEY = 'tm_dev_music_included';

export type MusicTrack = 'menu' | 'game';

// Single-track mode: gameplay.m4a is intentionally NOT required here — a
// require() would bundle its ~2MB into both store binaries and decode it
// into a player on every cold launch, and nothing plays it. Re-add the
// entry when the two-track system returns.
const TRACK_SOURCES: Partial<Record<MusicTrack, any>> = {
  menu: require('@/assets/sounds/music/theme.m4a'),
};
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
function waitForPlaybackStart(snd: Sound, timeoutMs = 500): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now();
    const poll = () => {
      snd.getCurrentTime(seconds => {
        if (seconds > 0 || Date.now() - start > timeoutMs) {
          resolve();
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
}

const MusicCtx = createContext<MusicCtxType>({
  musicEnabled: true,
  setMusicEnabled: () => {},
  devMusicIncluded: false,
  setDevMusicIncluded: () => {},
  playTrack: () => {},
  pauseMusic: () => {},
  resumeMusic: () => {},
  launchIntroActive: false,
  launchPlaybackStarted: false,
  launchStingerDurationMs: null,
  bpm: TRACK_BPM.menu,
  musicSyncEpoch: 0,
  musicSyncStartedAt: 0,
  menuLoopDurationMs: null,
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabledState] = useState(true);
  const [devMusicIncluded, setDevMusicIncludedState] = useState(false);
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
  const enabledRef = useRef(true);
  enabledRef.current = musicEnabled;
  const devIncludedRef = useRef(false);
  devIncludedRef.current = devMusicIncluded;

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

  useEffect(() => {
    (async () => {
      const [enabledVal, devVal] = await Promise.all([
        AsyncStorage.getItem(MUSIC_ENABLED_KEY).catch(() => null),
        AsyncStorage.getItem(DEV_MUSIC_INCLUDED_KEY).catch(() => null),
      ]);
      if (enabledVal === '0') setMusicEnabledState(false);
      if (devVal === '1') setDevMusicIncludedState(true);
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

  // Load both loop tracks + the one-shot launch stinger once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureAudioSessionCategory();
      if (cancelled) return;
      const [entries, launchSnd] = await Promise.all([
        Promise.all(
          (Object.keys(TRACK_SOURCES) as MusicTrack[]).map(async track => {
            const asset = Asset.fromModule(TRACK_SOURCES[track]);
            await asset.downloadAsync();
            const uri = asset.localUri || asset.uri;
            const snd = await loadMusic(uri);
            return [track, snd] as const;
          }),
        ),
        (async () => {
          const asset = Asset.fromModule(LAUNCH_SOURCE);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          return loadOneShot(uri);
        })(),
      ]);
      if (cancelled) return;
      for (const [track, snd] of entries) {
        if (snd) {
          soundsRef.current[track] = snd.sound;
          if (track === 'menu') setMenuLoopDurationMs(snd.durationMs);
        }
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
  }, []);

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
        try {
          theme.setCurrentTime(0);
          theme.setVolume(TRACK_VOLUME.menu);
          theme.play();
        } catch {}
        (theme as any)._lastVolume = TRACK_VOLUME.menu;
        await waitForPlaybackStart(theme);
        setMusicSyncStartedAt(Date.now());
        setMusicSyncEpoch(e => e + 1);
      }
      // Theme has started — the intro overlay's job is done.
      setLaunchIntroActive(false);
    };

    const launch = launchSoundRef.current;
    if (launch) {
      try {
        launch.setVolume(0.3);
        setLaunchPlaybackStarted(true);
        launch.play(() => startTheme());
      } catch {
        startTheme();
      }
    } else {
      // No stinger loaded — nothing for the overlay to show a bar for.
      startTheme();
    }
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
    await reactivateAudioSessionOnResume();
    const old = soundsRef.current.menu;
    try { old?.stop(); old?.release(); } catch {}
    const asset = Asset.fromModule(TRACK_SOURCES.menu);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    const loaded = await loadMusic(uri);
    if (loaded) {
      const { sound: snd, durationMs } = loaded;
      soundsRef.current.menu = snd;
      setMenuLoopDurationMs(durationMs);
      snd.setVolume(TRACK_VOLUME.menu);
      snd.play();
      (snd as any)._lastVolume = TRACK_VOLUME.menu;
      await waitForPlaybackStart(snd);
      setMusicSyncStartedAt(Date.now());
      setMusicSyncEpoch(e => e + 1);
    }
    setLaunchPlaybackStarted(false);
    setLaunchIntroActive(false);
  }, []);

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
  const reloadMenuTrack = useCallback(async () => {
    // Shared with SoundContext's own foreground handler — waits out
    // whichever context's native setCategory/setActive call is in flight
    // before either constructs new Sound instances, avoiding the same
    // concurrent-construction race that broke cold-launch playback.
    await reactivateAudioSessionOnResume();
    const old = soundsRef.current.menu;
    try { old?.stop(); old?.release(); } catch {}
    const asset = Asset.fromModule(TRACK_SOURCES.menu);
    await asset.downloadAsync(); // already local; just resolves the cached uri
    const uri = asset.localUri || asset.uri;
    const loaded = await loadMusic(uri);
    if (!loaded) return;
    const { sound: snd, durationMs } = loaded;
    soundsRef.current.menu = snd;
    setMenuLoopDurationMs(durationMs);
    snd.play();
    fadeTo('menu', TRACK_VOLUME[currentTrackRef.current]);
    await waitForPlaybackStart(snd);
    setMusicSyncStartedAt(Date.now());
    setMusicSyncEpoch(e => e + 1);
  }, [fadeTo]);

  // Pause music the instant the app leaves the foreground (home button, app
  // switcher, incoming call, etc.) and resume the current track on return —
  // otherwise it keeps playing in the background regardless of audio-session
  // category, which isn't the intended behavior for game music.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (enabledRef.current && devIncludedRef.current) {
          if (launchInFlightRef.current) {
            completeLaunchOnResume();
          } else {
            reloadMenuTrack();
          }
        }
      } else {
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
  }, [fadeTo, reloadMenuTrack, completeLaunchOnResume]);

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

  const setMusicEnabled = useCallback((v: boolean) => {
    setMusicEnabledState(v);
    AsyncStorage.setItem(MUSIC_ENABLED_KEY, v ? '1' : '0').catch(() => {});
    if (!devIncludedRef.current) return;
    if (!v) stopInFlightLaunch();
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    if (v) {
      if (hasPlayedLaunchRef.current) {
        const vol = TRACK_VOLUME[currentTrackRef.current];
        try { snd.setVolume(vol); snd.play(); } catch {}
        (snd as any)._lastVolume = vol;
      }
    } else {
      try { snd.pause(); } catch {}
    }
  }, []);

  const setDevMusicIncluded = useCallback((v: boolean) => {
    setDevMusicIncludedState(v);
    AsyncStorage.setItem(DEV_MUSIC_INCLUDED_KEY, v ? '1' : '0').catch(() => {});
    if (!enabledRef.current) return;
    if (!v) stopInFlightLaunch();
    const snd = soundsRef.current.menu;
    if (!snd) return;
    clearFade('menu');
    if (v) {
      if (hasPlayedLaunchRef.current) {
        const vol = TRACK_VOLUME[currentTrackRef.current];
        try { snd.setVolume(vol); snd.play(); } catch {}
        (snd as any)._lastVolume = vol;
      }
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
        playLaunchSequence();
      }
    }
  }, [tracksReady, settingsReady, musicEnabled, devMusicIncluded, playLaunchSequence]);

  const value = useMemo(
    () => ({
      musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic,
      launchIntroActive, launchPlaybackStarted, launchStingerDurationMs,
      bpm: TRACK_BPM.menu, musicSyncEpoch, musicSyncStartedAt, menuLoopDurationMs,
    }),
    [
      musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic,
      launchIntroActive, launchPlaybackStarted, launchStingerDurationMs, musicSyncEpoch, musicSyncStartedAt,
      menuLoopDurationMs,
    ],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  return useContext(MusicCtx);
}
