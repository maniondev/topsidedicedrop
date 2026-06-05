/**
 * Shared context so sibling screens (Settings) can check whether
 * a run is in progress and request it to end cleanly.
 */
import React, { createContext, useContext, useRef, useState, useCallback, useMemo, ReactNode } from 'react';

interface GameStatusCtxType {
  isGameActive: boolean;
  setGameActive: (v: boolean) => void;
  /** Call to immediately end the active run (triggers resetGame in index.tsx) */
  endGame: () => void;
  /** index.tsx registers its resetGame callback here */
  registerEndGame: (fn: () => void) => void;
}

const GameStatusCtx = createContext<GameStatusCtxType>({
  isGameActive: false,
  setGameActive: () => {},
  endGame: () => {},
  registerEndGame: () => {},
});

export function GameStatusProvider({ children }: { children: ReactNode }) {
  const [isGameActive, setGameActive] = useState(false);
  const endGameRef = useRef<() => void>(() => {});

  const endGame = useCallback(() => { endGameRef.current(); }, []);
  const registerEndGame = useCallback((fn: () => void) => { endGameRef.current = fn; }, []);

  const value = useMemo(
    () => ({ isGameActive, setGameActive, endGame, registerEndGame }),
    [isGameActive, endGame, registerEndGame],
  );

  return <GameStatusCtx.Provider value={value}>{children}</GameStatusCtx.Provider>;
}

export function useGameStatus() {
  return useContext(GameStatusCtx);
}
