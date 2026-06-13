import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiceStyleId = 'classic' | 'sketch' | 'round' | 'pixel' | 'neon' | 'raised';

export const DICE_STYLE_IDS: DiceStyleId[] = ['classic', 'sketch', 'round', 'pixel', 'neon', 'raised'];

export const DiceStyleMeta: Record<DiceStyleId, { label: string; description: string; free: boolean }> = {
  classic: { label: 'Classic',  description: 'Solid fill, round corners',     free: true  },
  sketch:  { label: 'Sketch',   description: 'Outlined border, hollow pips',  free: false },
  round:   { label: 'Round',    description: 'Circular dice shape',           free: false },
  pixel:   { label: '8-Bit',    description: 'Hard edges, square pips',       free: false },
  neon:    { label: 'Neon',     description: 'Dark fill with glowing edges',  free: false },
  raised:  { label: 'Raised',   description: 'Beveled 3D look with shading', free: false },
};

const DICE_STYLE_KEY = 'tm_dice_style';

interface DiceStyleCtxType {
  diceStyle: DiceStyleId;
  setDiceStyle: (id: DiceStyleId) => void;
}

const DiceStyleCtx = createContext<DiceStyleCtxType>({
  diceStyle: 'classic',
  setDiceStyle: () => {},
});

export function DiceStyleProvider({ children }: { children: ReactNode }) {
  const [diceStyle, setDiceStyleState] = useState<DiceStyleId>('classic');

  useEffect(() => {
    AsyncStorage.getItem(DICE_STYLE_KEY).then(v => {
      if (v && DICE_STYLE_IDS.includes(v as DiceStyleId)) setDiceStyleState(v as DiceStyleId);
    }).catch(() => {});
  }, []);

  const setDiceStyle = useCallback((id: DiceStyleId) => {
    setDiceStyleState(id);
    AsyncStorage.setItem(DICE_STYLE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({ diceStyle, setDiceStyle }), [diceStyle, setDiceStyle]);
  return <DiceStyleCtx.Provider value={value}>{children}</DiceStyleCtx.Provider>;
}

export function useDiceStyle() {
  return useContext(DiceStyleCtx);
}
