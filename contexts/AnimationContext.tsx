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

interface AnimCtxType {
  animPack: AnimPackId;
  setAnimPack: (p: AnimPackId) => void;
}

const AnimCtx = createContext<AnimCtxType>({
  animPack: 'classic',
  setAnimPack: () => {},
});

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [animPack, setAnimPackState] = useState<AnimPackId>('classic');

  useEffect(() => {
    AsyncStorage.getItem(ANIM_PACK_KEY).then(v => {
      if (v && ANIM_PACK_IDS.includes(v as AnimPackId)) setAnimPackState(v as AnimPackId);
    }).catch(() => {});
  }, []);

  const setAnimPack = useCallback((p: AnimPackId) => {
    setAnimPackState(p);
    AsyncStorage.setItem(ANIM_PACK_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => ({ animPack, setAnimPack }), [animPack, setAnimPack]);
  return <AnimCtx.Provider value={value}>{children}</AnimCtx.Provider>;
}

export function useAnimation() {
  return useContext(AnimCtx);
}
