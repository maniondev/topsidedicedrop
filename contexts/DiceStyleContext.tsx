import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiceStyleId = 'classic' | 'sketch' | 'pixel' | 'neon' | 'raised' | 'wooden' | 'ocean' | 'pastel' | 'comic';

export const DICE_STYLE_IDS: DiceStyleId[] = ['classic', 'wooden', 'pixel', 'ocean', 'neon', 'raised', 'pastel', 'sketch', 'comic'];

export const DiceStyleMeta: Record<DiceStyleId, { label: string; description: string; free: boolean }> = {
  classic: { label: 'Classic',  description: 'Solid fill, round corners',     free: true  },
  sketch:  { label: 'Sketch',   description: 'Outlined border, hollow pips',  free: false },
  pixel:   { label: '8-Bit',    description: 'Hard edges, square pips',       free: false },
  neon:    { label: 'Neon',     description: 'Dark fill with glowing edges',  free: false },
  raised:  { label: 'Raised',   description: 'Beveled 3D look with shading', free: false },
  wooden:  { label: 'Wooden',   description: 'Carved wood grain, engraved pips', free: false },
  ocean:   { label: 'Sea Glass', description: 'Smooth glossy sea glass',       free: false },
  pastel:  { label: 'Jelly',     description: 'Soft puffy candy jelly',        free: false },
  comic:   { label: 'Pop Art',   description: 'Comic halftone, bold ink outline', free: false },
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
