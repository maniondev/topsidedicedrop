import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_ENABLED_KEY = 'tm_music_enabled';
const DEV_MUSIC_INCLUDED_KEY = 'tm_dev_music_included';

export type MusicTrack = 'menu' | 'game';

const TRACK_SOURCES: Record<MusicTrack, any> = {
  menu: require('@/assets/sounds/music/theme.mp3'),
  game: require('@/assets/sounds/music/gameplay.mp3'),
};

const CROSSFADE_MS = 800;
const FADE_STEP_MS = 32;
const MUSIC_VOLUME = 0.55; // ceiling volume so music sits under SFX

function loadMusic(uri: string): Promise<Sound | null> {
  return new Promise(resolve => {
    const snd = new Sound(uri, '', error => {
      if (error) { resolve(null); return; }
      snd.setNumberOfLoops(-1);
      try { snd.setVolume(0); } catch {}
      resolve(snd);
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
}

const MusicCtx = createContext<MusicCtxType>({
  musicEnabled: true,
  setMusicEnabled: () => {},
  devMusicIncluded: false,
  setDevMusicIncluded: () => {},
  playTrack: () => {},
  pauseMusic: () => {},
  resumeMusic: () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabledState] = useState(true);
  const [devMusicIncluded, setDevMusicIncludedState] = useState(false);
  const [tracksReady, setTracksReady] = useState(false);
  const enabledRef = useRef(true);
  enabledRef.current = musicEnabled;
  const devIncludedRef = useRef(false);
  devIncludedRef.current = devMusicIncluded;

  const soundsRef = useRef<Partial<Record<MusicTrack, Sound>>>({});
  const currentTrackRef = useRef<MusicTrack>('menu');
  const fadeIntervalsRef = useRef<Partial<Record<MusicTrack, ReturnType<typeof setInterval>>>>({});

  useEffect(() => {
    AsyncStorage.getItem(MUSIC_ENABLED_KEY).then(v => { if (v === '0') setMusicEnabledState(false); }).catch(() => {});
    AsyncStorage.getItem(DEV_MUSIC_INCLUDED_KEY).then(v => { if (v === '1') setDevMusicIncludedState(true); }).catch(() => {});
  }, []);

  // Load both tracks once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        (Object.keys(TRACK_SOURCES) as MusicTrack[]).map(async track => {
          const asset = Asset.fromModule(TRACK_SOURCES[track]);
          await asset.downloadAsync();
          const uri = asset.localUri || asset.uri;
          const snd = await loadMusic(uri);
          return [track, snd] as const;
        }),
      );
      if (cancelled) return;
      for (const [track, snd] of entries) {
        if (snd) soundsRef.current[track] = snd;
      }
      setTracksReady(true);
    })();
    return () => {
      cancelled = true;
      Object.values(fadeIntervalsRef.current).forEach(id => id && clearInterval(id));
      Object.values(soundsRef.current).forEach(s => { try { s.stop(); s.release(); } catch {} });
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
    const start = (snd as any)._lastVolume ?? (target > 0 ? 0 : MUSIC_VOLUME);
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

  const playTrack = useCallback((track: MusicTrack) => {
    currentTrackRef.current = track;
    if (!enabledRef.current || !devIncludedRef.current) return;

    const incoming = soundsRef.current[track];
    if (!incoming) return;

    // Start incoming track from the beginning (if not already playing) and fade it in.
    incoming.getCurrentTime((_seconds, isPlaying) => {
      if (!isPlaying) {
        try { incoming.setCurrentTime(0); } catch {}
        incoming.play();
      }
    });
    fadeTo(track, MUSIC_VOLUME);

    // Fade out and pause every other loaded track.
    (Object.keys(soundsRef.current) as MusicTrack[]).forEach(other => {
      if (other === track) return;
      const snd = soundsRef.current[other];
      if (!snd) return;
      fadeTo(other, 0, () => { try { snd.pause(); } catch {} });
    });
  }, [fadeTo]);

  // Pause/resume the current track in place — no track switch, no restart.
  // Used for in-game pause (as opposed to leaving the game screen entirely,
  // which goes through playTrack() and restarts the menu track).
  const pauseMusic = useCallback(() => {
    const track = currentTrackRef.current;
    const snd = soundsRef.current[track];
    if (!snd) return;
    clearFade(track);
    try { snd.pause(); } catch {}
  }, []);

  const resumeMusic = useCallback(() => {
    if (!enabledRef.current || !devIncludedRef.current) return;
    const track = currentTrackRef.current;
    const snd = soundsRef.current[track];
    if (!snd) return;
    snd.play();
    fadeTo(track, MUSIC_VOLUME);
  }, [fadeTo]);

  // Pause music the instant the app leaves the foreground (home button, app
  // switcher, incoming call, etc.) and resume the current track on return —
  // otherwise it keeps playing in the background regardless of audio-session
  // category, which isn't the intended behavior for game music.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (enabledRef.current && devIncludedRef.current) {
          const snd = soundsRef.current[currentTrackRef.current];
          if (snd) {
            snd.play();
            fadeTo(currentTrackRef.current, MUSIC_VOLUME);
          }
        }
      } else {
        (Object.keys(soundsRef.current) as MusicTrack[]).forEach(track => {
          const snd = soundsRef.current[track];
          if (!snd) return;
          clearFade(track);
          try { snd.pause(); } catch {}
        });
      }
    });
    return () => sub.remove();
  }, [fadeTo]);

  const setMusicEnabled = useCallback((v: boolean) => {
    setMusicEnabledState(v);
    AsyncStorage.setItem(MUSIC_ENABLED_KEY, v ? '1' : '0').catch(() => {});
    if (v) {
      playTrack(currentTrackRef.current);
    } else {
      (Object.keys(soundsRef.current) as MusicTrack[]).forEach(track => {
        const snd = soundsRef.current[track];
        if (!snd) return;
        fadeTo(track, 0, () => { try { snd.pause(); } catch {} });
      });
    }
  }, [fadeTo, playTrack]);

  const setDevMusicIncluded = useCallback((v: boolean) => {
    setDevMusicIncludedState(v);
    AsyncStorage.setItem(DEV_MUSIC_INCLUDED_KEY, v ? '1' : '0').catch(() => {});
    if (v && enabledRef.current) {
      playTrack(currentTrackRef.current);
    } else if (!v) {
      (Object.keys(soundsRef.current) as MusicTrack[]).forEach(track => {
        const snd = soundsRef.current[track];
        if (!snd) return;
        clearFade(track);
        try { snd.pause(); snd.setVolume(0); } catch {}
      });
    }
  }, [playTrack]);

  // Kick off playback once tracks finish loading, if settings were already on
  // by the time loading completes (covers both load-order races: settings
  // resolving before or after the tracks themselves finish loading).
  useEffect(() => {
    if (tracksReady && musicEnabled && devMusicIncluded) {
      playTrack(currentTrackRef.current);
    }
  }, [tracksReady, musicEnabled, devMusicIncluded, playTrack]);

  const value = useMemo(
    () => ({ musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic }),
    [musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded, playTrack, pauseMusic, resumeMusic],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  return useContext(MusicCtx);
}
