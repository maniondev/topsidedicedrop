import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Difficulty ramp key: 'moves' (pieces generated) is the SHIPPING behavior —
// a scoring streak no longer drags difficulty forward on its own, so skill
// shows up as score-per-move rather than as a faster clock. 'score' is the
// legacy ramp, kept only so it can be A/B'd against.
//
// The toggle between them is dev-only (hidden gesture in Settings, __DEV__
// gated); production always gets the default below.
export type RampMode = 'score' | 'moves';

const RAMP_MODE_KEY = 'tm_dev_ramp_mode';

interface RampModeCtxType {
  rampMode: RampMode;
  setRampMode: (m: RampMode) => void;
}

const RampModeCtx = createContext<RampModeCtxType>({
  rampMode: 'moves',
  setRampMode: () => {},
});

export function RampModeProvider({ children }: { children: ReactNode }) {
  const [rampMode, setRampModeState] = useState<RampMode>('moves');

  useEffect(() => {
    AsyncStorage.getItem(RAMP_MODE_KEY).then(v => {
      if (v === 'score' || v === 'moves') setRampModeState(v);
    }).catch(() => {});
  }, []);

  const setRampMode = useCallback((m: RampMode) => {
    setRampModeState(m);
    AsyncStorage.setItem(RAMP_MODE_KEY, m).catch(() => {});
  }, []);

  const value = useMemo(() => ({ rampMode, setRampMode }), [rampMode, setRampMode]);

  return <RampModeCtx.Provider value={value}>{children}</RampModeCtx.Provider>;
}

export function useRampMode() {
  return useContext(RampModeCtx);
}
