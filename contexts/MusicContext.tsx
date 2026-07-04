import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_ENABLED_KEY = 'tm_music_enabled';
const DEV_MUSIC_INCLUDED_KEY = 'tm_dev_music_included';

interface MusicCtxType {
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
  // Dev-only: simulates having a music track shipped, so the split
  // Sound Effects / Music UI can be tested before a real track is added.
  devMusicIncluded: boolean;
  setDevMusicIncluded: (v: boolean) => void;
}

const MusicCtx = createContext<MusicCtxType>({
  musicEnabled: true,
  setMusicEnabled: () => {},
  devMusicIncluded: false,
  setDevMusicIncluded: () => {},
});

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabledState] = useState(true);
  const [devMusicIncluded, setDevMusicIncludedState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(MUSIC_ENABLED_KEY).then(v => { if (v === '0') setMusicEnabledState(false); }).catch(() => {});
    AsyncStorage.getItem(DEV_MUSIC_INCLUDED_KEY).then(v => { if (v === '1') setDevMusicIncludedState(true); }).catch(() => {});
  }, []);

  const setMusicEnabled = useCallback((v: boolean) => {
    setMusicEnabledState(v);
    AsyncStorage.setItem(MUSIC_ENABLED_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const setDevMusicIncluded = useCallback((v: boolean) => {
    setDevMusicIncludedState(v);
    AsyncStorage.setItem(DEV_MUSIC_INCLUDED_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded }),
    [musicEnabled, setMusicEnabled, devMusicIncluded, setDevMusicIncluded],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  return useContext(MusicCtx);
}
