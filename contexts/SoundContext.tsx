import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreGameAudioSession } from '@/lib/audioSession';
import { SOUND_KEY } from '@/lib/storage';

function loadSound(uri: string, vol: number): Promise<Sound | null> {
  return new Promise(resolve => {
    const snd = new Sound(uri, '', error => {
      if (error) { resolve(null); return; }
      try { snd.setVolume(vol); } catch {}
      resolve(snd);
    });
  });
}

export type SoundPackId = 'topside' | 'splash' | 'dig' | 'marimba' | 'bubbles' | 'snow' | 'fight' | 'coins' | 'metal' | 'rubber';
export const SOUND_PACK_IDS: SoundPackId[] = ['topside', 'splash', 'dig', 'marimba', 'bubbles', 'snow', 'fight', 'coins', 'metal', 'rubber'];
export const SoundPackMeta: Record<SoundPackId, { label: string; description: string; hidden?: boolean }> = {
  topside: { label: 'Topside',  description: 'The signature Topside sound' },
  splash:  { label: 'Splash',   description: 'Watery, bubbly drops' },
  dig:     { label: 'Dig',      description: 'Earthy, percussive hits' },
  marimba: { label: 'Marimba',  description: 'Warm wooden tones' },
  bubbles: { label: 'Bubbles',  description: 'Light, airy bubble pops' },
  snow:    { label: 'Snow',     description: 'Soft, wintry tones' },
  fight:   { label: 'Fight',    description: 'Punchy, combat hits' },
  coins:   { label: 'Coins',    description: 'Bright, coin-like chimes' },
  metal:   { label: 'Metal',    description: 'Heavy metallic strikes' },
  rubber:  { label: 'Rubber',   description: 'Bouncy, rubbery hits', hidden: true },
};

// All packs pre-required (Metro needs static paths)
const SOUND_PACKS: Record<SoundPackId, Record<string, any>> = {
  topside: {
    drop:     require('@/assets/sounds/topside/drop.m4a'),
    lock:     require('@/assets/sounds/topside/lock.m4a'),
    merge1:   require('@/assets/sounds/topside/merge1.m4a'),
    merge2:   require('@/assets/sounds/topside/merge2.m4a'),
    merge3:   require('@/assets/sounds/topside/merge3.m4a'),
    merge4:   require('@/assets/sounds/topside/merge4.m4a'),
    merge5:   require('@/assets/sounds/topside/merge5.m4a'),
    merge6:   require('@/assets/sounds/topside/merge6.m4a'),
    clear:    require('@/assets/sounds/topside/clear.m4a'),
    chain:    require('@/assets/sounds/topside/chain.m4a'),
    gameover: require('@/assets/sounds/topside/gameover.m4a'),
    condense: require('@/assets/sounds/topside/condense.m4a'),
  },
  splash: {
    drop:     require('@/assets/sounds/splash/drop.m4a'),
    lock:     require('@/assets/sounds/splash/lock.m4a'),
    merge1:   require('@/assets/sounds/splash/merge1.m4a'),
    merge2:   require('@/assets/sounds/splash/merge2.m4a'),
    merge3:   require('@/assets/sounds/splash/merge3.m4a'),
    merge4:   require('@/assets/sounds/splash/merge4.m4a'),
    merge5:   require('@/assets/sounds/splash/merge5.m4a'),
    merge6:   require('@/assets/sounds/splash/merge6.m4a'),
    clear:    require('@/assets/sounds/splash/clear.m4a'),
    chain:    require('@/assets/sounds/splash/chain.m4a'),
    gameover: require('@/assets/sounds/splash/gameover.m4a'),
    condense: require('@/assets/sounds/splash/condense.m4a'),
  },
  dig: {
    drop:     require('@/assets/sounds/dig/drop.m4a'),
    lock:     require('@/assets/sounds/dig/lock.m4a'),
    merge1:   require('@/assets/sounds/dig/merge1.m4a'),
    merge2:   require('@/assets/sounds/dig/merge2.m4a'),
    merge3:   require('@/assets/sounds/dig/merge3.m4a'),
    merge4:   require('@/assets/sounds/dig/merge4.m4a'),
    merge5:   require('@/assets/sounds/dig/merge5.m4a'),
    merge6:   require('@/assets/sounds/dig/merge6.m4a'),
    clear:    require('@/assets/sounds/dig/clear.m4a'),
    chain:    require('@/assets/sounds/dig/chain.m4a'),
    gameover: require('@/assets/sounds/dig/gameover.m4a'),
    condense: require('@/assets/sounds/dig/condense.m4a'),
  },
  marimba: {
    drop:     require('@/assets/sounds/marimba/drop.m4a'),
    lock:     require('@/assets/sounds/marimba/lock.m4a'),
    merge1:   require('@/assets/sounds/marimba/merge1.m4a'),
    merge2:   require('@/assets/sounds/marimba/merge2.m4a'),
    merge3:   require('@/assets/sounds/marimba/merge3.m4a'),
    merge4:   require('@/assets/sounds/marimba/merge4.m4a'),
    merge5:   require('@/assets/sounds/marimba/merge5.m4a'),
    merge6:   require('@/assets/sounds/marimba/merge6.m4a'),
    clear:    require('@/assets/sounds/marimba/clear.m4a'),
    chain:    require('@/assets/sounds/marimba/chain.m4a'),
    gameover: require('@/assets/sounds/marimba/gameover.m4a'),
    condense: require('@/assets/sounds/marimba/condense.m4a'),
  },
  bubbles: {
    drop:     require('@/assets/sounds/bubbles/drop.m4a'),
    lock:     require('@/assets/sounds/bubbles/lock.m4a'),
    merge1:   require('@/assets/sounds/bubbles/merge1.m4a'),
    merge2:   require('@/assets/sounds/bubbles/merge2.m4a'),
    merge3:   require('@/assets/sounds/bubbles/merge3.m4a'),
    merge4:   require('@/assets/sounds/bubbles/merge4.m4a'),
    merge5:   require('@/assets/sounds/bubbles/merge5.m4a'),
    merge6:   require('@/assets/sounds/bubbles/merge6.m4a'),
    clear:    require('@/assets/sounds/bubbles/clear.m4a'),
    chain:    require('@/assets/sounds/bubbles/chain.m4a'),
    gameover: require('@/assets/sounds/bubbles/gameover.m4a'),
    condense: require('@/assets/sounds/bubbles/condense.m4a'),
  },
  snow: {
    drop:     require('@/assets/sounds/snow/drop.m4a'),
    lock:     require('@/assets/sounds/snow/lock.m4a'),
    merge1:   require('@/assets/sounds/snow/merge1.m4a'),
    merge2:   require('@/assets/sounds/snow/merge2.m4a'),
    merge3:   require('@/assets/sounds/snow/merge3.m4a'),
    merge4:   require('@/assets/sounds/snow/merge4.m4a'),
    merge5:   require('@/assets/sounds/snow/merge5.m4a'),
    merge6:   require('@/assets/sounds/snow/merge6.m4a'),
    clear:    require('@/assets/sounds/snow/clear.m4a'),
    chain:    require('@/assets/sounds/snow/chain.m4a'),
    gameover: require('@/assets/sounds/snow/gameover.m4a'),
    condense: require('@/assets/sounds/snow/condense.m4a'),
  },
  fight: {
    drop:     require('@/assets/sounds/fight/drop.m4a'),
    lock:     require('@/assets/sounds/fight/lock.m4a'),
    merge1:   require('@/assets/sounds/fight/merge1.m4a'),
    merge2:   require('@/assets/sounds/fight/merge2.m4a'),
    merge3:   require('@/assets/sounds/fight/merge3.m4a'),
    merge4:   require('@/assets/sounds/fight/merge4.m4a'),
    merge5:   require('@/assets/sounds/fight/merge5.m4a'),
    merge6:   require('@/assets/sounds/fight/merge6.m4a'),
    clear:    require('@/assets/sounds/fight/clear.m4a'),
    chain:    require('@/assets/sounds/fight/chain.m4a'),
    gameover: require('@/assets/sounds/fight/gameover.m4a'),
    condense: require('@/assets/sounds/fight/condense.m4a'),
  },
  coins: {
    drop:     require('@/assets/sounds/coins/drop.m4a'),
    lock:     require('@/assets/sounds/coins/lock.m4a'),
    merge1:   require('@/assets/sounds/coins/merge1.m4a'),
    merge2:   require('@/assets/sounds/coins/merge2.m4a'),
    merge3:   require('@/assets/sounds/coins/merge3.m4a'),
    merge4:   require('@/assets/sounds/coins/merge4.m4a'),
    merge5:   require('@/assets/sounds/coins/merge5.m4a'),
    merge6:   require('@/assets/sounds/coins/merge6.m4a'),
    clear:    require('@/assets/sounds/coins/clear.m4a'),
    chain:    require('@/assets/sounds/coins/chain.m4a'),
    gameover: require('@/assets/sounds/coins/gameover.m4a'),
    condense: require('@/assets/sounds/coins/condense.m4a'),
  },
  rubber: {
    drop:     require('@/assets/sounds/rubber/drop.m4a'),
    lock:     require('@/assets/sounds/rubber/lock.m4a'),
    merge1:   require('@/assets/sounds/rubber/merge1.m4a'),
    merge2:   require('@/assets/sounds/rubber/merge2.m4a'),
    merge3:   require('@/assets/sounds/rubber/merge3.m4a'),
    merge4:   require('@/assets/sounds/rubber/merge4.m4a'),
    merge5:   require('@/assets/sounds/rubber/merge5.m4a'),
    merge6:   require('@/assets/sounds/rubber/merge6.m4a'),
    clear:    require('@/assets/sounds/rubber/clear.m4a'),
    chain:    require('@/assets/sounds/rubber/chain.m4a'),
    gameover: require('@/assets/sounds/rubber/gameover.m4a'),
    condense: require('@/assets/sounds/rubber/condense.m4a'),
  },
  metal: {
    drop:     require('@/assets/sounds/metal/drop.m4a'),
    lock:     require('@/assets/sounds/metal/lock.m4a'),
    merge1:   require('@/assets/sounds/metal/merge1.m4a'),
    merge2:   require('@/assets/sounds/metal/merge2.m4a'),
    merge3:   require('@/assets/sounds/metal/merge3.m4a'),
    merge4:   require('@/assets/sounds/metal/merge4.m4a'),
    merge5:   require('@/assets/sounds/metal/merge5.m4a'),
    merge6:   require('@/assets/sounds/metal/merge6.m4a'),
    clear:    require('@/assets/sounds/metal/clear.m4a'),
    chain:    require('@/assets/sounds/metal/chain.m4a'),
    gameover: require('@/assets/sounds/metal/gameover.m4a'),
    condense: require('@/assets/sounds/metal/condense.m4a'),
  },
};

export type SoundName = 'drop' | 'lock' | 'merge1' | 'merge2' | 'merge3' | 'merge4' | 'merge5' | 'merge6' | 'clear' | 'chain' | 'gameover' | 'condense';
const SOUND_NAMES: SoundName[] = ['drop','lock','merge1','merge2','merge3','merge4','merge5','merge6','clear','chain','gameover','condense'];

const POOL_SIZE: Record<SoundName, number> = {
  drop: 6, lock: 3, merge1: 2, merge2: 2, merge3: 2, merge4: 2, merge5: 2, merge6: 2,
  clear: 2, chain: 3, gameover: 1, condense: 1,
};

const VOLUME: Record<SoundName, number> = {
  drop: 0.30, lock: 0.72, merge1: 0.96, merge2: 0.96, merge3: 0.96, merge4: 0.96, merge5: 0.96, merge6: 0.96,
  clear: 0.84, chain: 0.66, gameover: 0.42, condense: 0.42,
};

// Per-pack volume overrides — only specify sounds that differ from VOLUME above
const PACK_VOLUME: Partial<Record<SoundPackId, Partial<Record<SoundName, number>>>> = {
  topside: {
    drop:   0.50,
    merge1: 1.0, merge2: 1.0, merge3: 1.0, merge4: 1.0, merge5: 1.0, merge6: 1.0,
    clear:  0.98,
  },
  splash: {
    drop:   0.20,  // 0.24 * 0.85
    merge1: 0.65, merge2: 0.65, merge3: 0.65, merge4: 0.65, merge5: 0.65, merge6: 0.65,
    clear:  0.57,  // 0.67 * 0.85
  },
  marimba: {
    drop:   0.28,
    merge1: 0.72, merge2: 0.72, merge3: 0.72, merge4: 0.72, merge5: 0.72, merge6: 0.72,
    clear:  0.65,
  },
  dig: {
    drop:   0.24,  // unchanged
    merge1: 0.65, merge2: 0.65, merge3: 0.65, merge4: 0.65, merge5: 0.65, merge6: 0.65,
    clear:  0.57,
  },
};

const SOUND_PACK_KEY = 'tm_sound_pack';

interface SoundCtxType {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  soundPack: SoundPackId;
  setSoundPack: (p: SoundPackId) => void;
  play: (name: SoundName, rate?: number) => void;
}

const SoundCtx = createContext<SoundCtxType>({
  soundEnabled: true,
  setSoundEnabled: () => {},
  soundPack: 'topside',
  setSoundPack: () => {},
  play: () => {},
});

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [soundPack, setSoundPackState] = useState<SoundPackId>('topside');
  const enabledRef   = useRef(true);
  enabledRef.current = soundEnabled;
  const soundPackRef = useRef<SoundPackId>('topside');
  soundPackRef.current = soundPack;
  const poolsRef      = useRef<Partial<Record<SoundName, Sound[]>>>({});
  const idxRef        = useRef<Partial<Record<SoundName, number>>>({});
  const loadingRef  = useRef(false);

  // Load persisted settings
  useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then(v => { if (v === '0') setSoundEnabledState(false); }).catch(() => {});
    AsyncStorage.getItem(SOUND_PACK_KEY).then(v => { if (v && v in SOUND_PACKS) setSoundPackState(v as SoundPackId); }).catch(() => {});
  }, []);

  async function buildPool(pack: SoundPackId, cancelled: () => boolean) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      Sound.setCategory('Ambient');

      const sources = SOUND_PACKS[pack];
      const assets  = SOUND_NAMES.map(name => ({ name, asset: Asset.fromModule(sources[name]) }));
      await Promise.allSettled(assets.map(({ asset }) => asset.downloadAsync()));
      if (cancelled()) return;

      const pools: Partial<Record<SoundName, Sound[]>> = {};
      await Promise.all(assets.map(async ({ name, asset }) => {
        const uri = asset.localUri || asset.uri;
        const vol = PACK_VOLUME[pack]?.[name] ?? VOLUME[name] ?? 1;
        const results = await Promise.all(
          Array.from({ length: POOL_SIZE[name] ?? 1 }, () => loadSound(uri, vol))
        );
        pools[name] = results.filter((s): s is Sound => s !== null);
        idxRef.current[name] = 0;
      }));
      if (cancelled()) {
        Object.values(pools).forEach(arr => arr?.forEach(s => { try { s.release(); } catch {} }));
        return;
      }
      // Release old pool then swap in new one atomically
      Object.values(poolsRef.current).forEach(arr => arr?.forEach(s => { try { s.stop(); s.release(); } catch {} }));
      poolsRef.current = pools;
    } finally {
      loadingRef.current = false;
    }
  }

  // Reload sound pool when pack changes
  useEffect(() => {
    let cancelled = false;
    buildPool(soundPack, () => cancelled);
    return () => { cancelled = true; };
  }, [soundPack]);

  useEffect(() => {
    return () => {
      Object.values(poolsRef.current).forEach(arr => arr?.forEach(s => { try { s.stop(); s.release(); } catch {} }));
      poolsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      // Rebuild the pool on foreground — Sound objects become stale after audio
      // session interruption (backgrounding, calls, Siri). Assets are cached
      // locally so this completes in ~200-500ms without blocking gameplay.
      buildPool(soundPackRef.current, () => false);
    });
    return () => sub.remove();
  }, []);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    AsyncStorage.setItem(SOUND_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const setSoundPack = useCallback((p: SoundPackId) => {
    setSoundPackState(p);
    AsyncStorage.setItem(SOUND_PACK_KEY, p).catch(() => {});
  }, []);

  const play = useCallback((name: SoundName, rate: number = 1) => {
    if (!enabledRef.current) return;
    const pool = poolsRef.current[name];
    if (!pool || pool.length === 0) return;
    const next = ((idxRef.current[name] ?? 0) + 1) % pool.length;
    idxRef.current[name] = next;
    const snd = pool[next];
    try {
      if (rate !== 1) { try { snd.setSpeed(rate); } catch {} }
      else { try { snd.setSpeed(1); } catch {} }
      snd.play((success) => {
        try { snd.setCurrentTime(0); } catch {}
        if (!success) {
          // Audio session was interrupted (call, Siri, notification) — re-activate and replay once.
          restoreGameAudioSession(0);
          setTimeout(() => {
            try { snd.play(() => { try { snd.setCurrentTime(0); } catch {} }); } catch {}
          }, 250);
        }
      });
    } catch {}
  }, []);

  const value = useMemo(() => ({ soundEnabled, setSoundEnabled, soundPack, setSoundPack, play }), [soundEnabled, soundPack, play]);
  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>;
}

export function useSound() {
  return useContext(SoundCtx);
}
