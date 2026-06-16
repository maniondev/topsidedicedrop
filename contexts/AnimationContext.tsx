import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnimPackId = 'classic' | 'extra' | 'minimal' | 'retro' | 'electric' | 'twist' | 'flip' | 'shatter' | 'glitch';

export const ANIM_PACK_IDS: AnimPackId[] = ['classic', 'extra', 'minimal', 'retro', 'electric', 'twist', 'flip', 'shatter', 'glitch'];

export const AnimPackMeta: Record<AnimPackId, { label: string; description: string; free: boolean; hidden?: boolean }> = {
  classic:  { label: 'Classic',  description: 'Glowing ring bursts',         free: true  },
  extra:    { label: 'Extra',    description: 'Bouncy, exaggerated merges',   free: false },
  minimal:  { label: 'Minimal',  description: 'Subtle fades, no burst',       free: false },
  retro:    { label: 'Retro',    description: 'Pixel-style pops',             free: false, hidden: true },
  electric: { label: 'Electric', description: 'Lightning crack effects',      free: false, hidden: true },
  twist:    { label: 'Twist',    description: '360° spin on every merge',     free: false },
  flip:     { label: 'Flip',     description: 'Card flip on every merge',     free: false, hidden: true },
  shatter:  { label: 'Shatter',  description: 'Tiles explode on merge',       free: false },
  glitch:   { label: 'Glitch',   description: 'Glitchy jitter effects',       free: false },
};

const ANIM_PACK_KEY = 'tm_anim_pack';
const PERF_MODE_KEY = 'tm_perf_mode';

interface AnimCtxType {
  animPack: AnimPackId;
  setAnimPack: (p: AnimPackId) => void;
  performanceMode: boolean;
  setPerformanceMode: (v: boolean) => void;
}

const AnimCtx = createContext<AnimCtxType>({
  animPack: 'classic',
  setAnimPack: () => {},
  performanceMode: false,
  setPerformanceMode: () => {},
});

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [animPack, setAnimPackState] = useState<AnimPackId>('classic');
  const [performanceMode, setPerfModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([ANIM_PACK_KEY, PERF_MODE_KEY]).then(([[, pack], [, perf]]) => {
      if (pack && ANIM_PACK_IDS.includes(pack as AnimPackId)) setAnimPackState(pack as AnimPackId);
      if (perf !== null) setPerfModeState(perf === 'true');
    }).catch(() => {});
  }, []);

  const setAnimPack = useCallback((p: AnimPackId) => {
    setAnimPackState(p);
    AsyncStorage.setItem(ANIM_PACK_KEY, p).catch(() => {});
  }, []);

  const setPerformanceMode = useCallback((v: boolean) => {
    setPerfModeState(v);
    AsyncStorage.setItem(PERF_MODE_KEY, v ? 'true' : 'false').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ animPack, setAnimPack, performanceMode, setPerformanceMode }),
    [animPack, setAnimPack, performanceMode, setPerformanceMode],
  );
  return <AnimCtx.Provider value={value}>{children}</AnimCtx.Provider>;
}

export function useAnimation() {
  return useContext(AnimCtx);
}
