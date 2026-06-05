import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreGameAudioSession } from '@/lib/audioSession';
import { SOUND_KEY } from '@/lib/storage';

const SOUND_SOURCES = {
  drop:     require('@/assets/sounds/drop.m4a'),
  merge:    require('@/assets/sounds/merge.m4a'),
  clear:    require('@/assets/sounds/clear.m4a'),
  chain:    require('@/assets/sounds/chain.m4a'),
  gameover: require('@/assets/sounds/gameover.m4a'),
  condense: require('@/assets/sounds/condense.m4a'),
} as const;

export type SoundName = keyof typeof SOUND_SOURCES;

const POOL_SIZE: Record<SoundName, number> = {
  drop: 6, merge: 4, clear: 2, chain: 3, gameover: 1, condense: 1,
};

const VOLUME: Record<SoundName, number> = {
  drop: 0.30, merge: 0.80, clear: 0.70, chain: 0.55, gameover: 0.35, condense: 0.35,
};

interface SoundCtxType {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  play: (name: SoundName) => void;
}

const SoundCtx = createContext<SoundCtxType>({
  soundEnabled: true,
  setSoundEnabled: () => {},
  play: () => {},
});

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const enabledRef = useRef(true);
  enabledRef.current = soundEnabled;
  const poolsRef = useRef<Partial<Record<SoundName, Sound[]>>>({});
  const idxRef = useRef<Partial<Record<SoundName, number>>>({});

  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then(v => { if (v === '0') setSoundEnabledState(false); }).catch(() => {});
    Sound.setCategory('Ambient', true);
    Sound.setActive(true);

    let cancelled = false;
    (async () => {
      const pools: Partial<Record<SoundName, Sound[]>> = {};
      for (const name of Object.keys(SOUND_SOURCES) as SoundName[]) {
        const asset = Asset.fromModule(SOUND_SOURCES[name]);
        try { await asset.downloadAsync(); } catch {}
        const uri = asset.localUri || asset.uri;
        const arr: Sound[] = [];
        const vol = VOLUME[name] ?? 1;
        for (let i = 0; i < (POOL_SIZE[name] ?? 1); i++) {
          const snd = new Sound(uri, '', () => { try { snd.setVolume(vol); } catch {} });
          arr.push(snd);
        }
        pools[name] = arr;
        idxRef.current[name] = 0;
      }
      if (cancelled) {
        Object.values(pools).forEach(arr => arr?.forEach(s => { try { s.release(); } catch {} }));
        return;
      }
      poolsRef.current = pools;
    })();

    return () => {
      cancelled = true;
      Object.values(poolsRef.current).forEach(arr => arr?.forEach(s => { try { s.release(); } catch {} }));
      poolsRef.current = {};
      try { Sound.setActive(false); } catch {}
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') restoreGameAudioSession(0);
    });
    return () => sub.remove();
  }, []);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    AsyncStorage.setItem(SOUND_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    const pool = poolsRef.current[name];
    if (!pool || pool.length === 0) return;
    const next = ((idxRef.current[name] ?? 0) + 1) % pool.length;
    idxRef.current[name] = next;
    const snd = pool[next];
    try { snd.play(() => { try { snd.setCurrentTime(0); } catch {} }); } catch {}
  }, []);

  const value = useMemo(() => ({ soundEnabled, setSoundEnabled, play }), [soundEnabled, setSoundEnabled, play]);
  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>;
}

export function useSound() {
  return useContext(SoundCtx);
}
