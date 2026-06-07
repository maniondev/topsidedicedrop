import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, BackHandler, AppState,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useDifficulty } from '@/contexts/DifficultyContext';
import { useGame } from '@/hooks/useGame';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import GameBoard from '@/components/game/GameBoard';
import HUD from '@/components/game/HUD';
import Controls from '@/components/game/Controls';
import GameOverModal from '@/components/game/GameOverModal';
import PauseModal from '@/components/game/PauseModal';
import EmergencyCondenseOverlay from '@/components/game/EmergencyCondenseOverlay';
import AdBanner from '@/components/AdBanner';
import AdInterstitial from '@/components/AdInterstitial';
import { onRunComplete } from '@/lib/adCounter';
import { saveGame, loadSavedGame, clearSavedGame } from '@/lib/storage';
import { runEmergencyCondense } from '@/lib/condense';
import { COLS, ROWS } from '@/constants/game';

// No tab bar in this screen — more space for the board
const HUD_H      = 96;
const CONTROLS_H = 76;
const BANNER_H   = 60; // matches BANNER_RESERVED_H in AdBanner
const V_PAD      = 40; // slack so the centered game block sits a bit lower / balanced

export default function GameScreen() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const { colors } = useTheme();
  const { statsFor, submitRun } = useStats();
  const { play } = useSound();
  const { isPremium } = usePremium();
  const { gravityMs, difficulty } = useDifficulty();
  const bestScore = statsFor(difficulty).bestScore;
  const { width, height } = useWindowDimensions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const [paused, setPaused] = useState(false);
  // Best score captured at game-over, BEFORE this run is submitted — so the
  // modal can show the previous best when you set a new record.
  const [prevBest, setPrevBest] = useState(0);

  const bannerH  = isPremium ? 0 : BANNER_H;
  const usedH    = safeTop + safeBottom + HUD_H + CONTROLS_H + bannerH + V_PAD;
  const availH   = height - usedH;
  const csH      = Math.floor(availH / ROWS);
  const csW      = Math.floor((width - 32) / COLS);
  const cellSize = Math.max(Math.min(csH, csW), 32);
  const boardW   = cellSize * COLS;

  const game = useGame(gravityMs, paused);

  const [showInterstitial,  setShowInterstitial]  = useState(false);
  const [pendingNewGame,    setPendingNewGame]     = useState(false);
  const [freeContinueUsed,  setFreeContinueUsed]  = useState(false);

  // On mount: start fresh if ?fresh=1, otherwise resume a saved game if one exists
  useEffect(() => {
    if (fresh === '1') {
      clearSavedGame(difficulty);
      game.startGame();
      return;
    }
    loadSavedGame(difficulty).then(saved => {
      if (saved) {
        clearSavedGame(difficulty);
        game.loadSaved(saved.board as any, saved.score, saved.queue as any, saved.runBestChain, saved.activePiece as any);
      } else {
        game.startGame();
      }
    }).catch(() => { game.startGame(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-pause when the app backgrounds (lock screen, app switch, incoming call)
  // — but only during active play, so it never interferes with the rewarded-ad
  // flow (which backgrounds the app while phase is gameOver/condensing).
  const phaseRef = useRef(game.phase);
  phaseRef.current = game.phase;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && (phaseRef.current === 'falling' || phaseRef.current === 'locking')) {
        setPaused(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Hardware back — pause instead of navigate
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPaused(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  const { adLoaded, showAd } = useRewardedAd(useCallback(() => {
    game.startCondense();
  }, [game.startCondense]));

  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    play('gameover');
    setPrevBest(bestScore); // capture old best before submitRun overwrites it
    const continueUsed = freeContinueUsed || game.continueAvailable === false;
    submitRun(game.score, game.runBestChain, difficulty, continueUsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  useEffect(() => {
    if (game.lastMergeEvents.length === 0) return;
    const hasClear = game.lastMergeEvents.some(e => e.newValue === 'clear');
    if (hasClear) {
      play('clear');
    } else {
      // Play merge1–merge6 in sequence during chain. If chain > 6, replay merge6.
      const MERGE_SOUNDS = ['merge1', 'merge2', 'merge3', 'merge4', 'merge5', 'merge6'] as const;
      const mergeIdx = Math.min(Math.max(0, game.chainPass - 1), 5);
      play(MERGE_SOUNDS[mergeIdx]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

  // Lock sound on any piece lock (natural gravity or hard drop)
  const prevPhaseRef = useRef(game.phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'falling' && game.phase === 'locking') {
      play('lock');
    }
    prevPhaseRef.current = game.phase;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Rotate with a subtle click. Discrete action — safe for the pooled audio engine.
  const rotateWithSound = useCallback(() => {
    play('drop');
    game.rotate();
  }, [play, game.rotate]);

  // Hard drop. Lock sound now plays on any lock (natural or hard drop).
  const hardDropWithSound = useCallback(() => {
    game.hardDrop();
  }, [game.hardDrop]);

  const handleFreeContinue = useCallback(() => {
    setFreeContinueUsed(true);
    game.startCondense();
  }, [game.startCondense]);

  const handleContinue = useCallback(() => {
    if (adLoaded) showAd();
  }, [adLoaded, showAd]);

  const handleNewGame = useCallback(() => {
    setPaused(false);
    if (onRunComplete() && !isPremium) {
      setPendingNewGame(true);
      setShowInterstitial(true);
    } else {
      setFreeContinueUsed(false);
      game.resetGame();
    }
  }, [isPremium, game.resetGame]);

  const handleInterstitialClose = useCallback(() => {
    setShowInterstitial(false);
    if (pendingNewGame) {
      setPendingNewGame(false);
      setFreeContinueUsed(false);
      game.resetGame();
    }
  }, [pendingNewGame, game.resetGame]);

  // Robust Emergency Condense: a single screen-level effect drives the board
  // compression and resume. Guarded by a ref so it runs exactly once per
  // 'condensing' phase, and survives the rewarded-ad background/foreground
  // transition (the screen stays mounted, unlike fragile in-overlay timers).
  const condenseRanRef = useRef(false);
  useEffect(() => {
    if (game.phase !== 'condensing') {
      condenseRanRef.current = false;
      return;
    }
    if (condenseRanRef.current) return;
    condenseRanRef.current = true;

    play('condense');
    const snapshot = game.board;
    const t = setTimeout(() => {
      const { finalBoard, scoreGained } = runEmergencyCondense(snapshot);
      game.finishCondense(finalBoard, scoreGained);
    }, 900); // brief hold so the "Condensing…" overlay is visible
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Save game and return to lobby
  const handleSaveAndQuit = useCallback(async () => {
    const exported = game.exportState();
    await saveGame({
      board: exported.board as any,
      score: exported.score,
      queue: exported.queue as any,
      activePiece: exported.activePiece as any,
      runBestChain: exported.runBestChain,
      difficulty,
      savedAt: Date.now(),
    });
    router.back();
  }, [game.exportState, difficulty]);

  // Quit without saving
  const handleQuit = useCallback(() => {
    router.back();
  }, []);

  const controlsDisabled =
    paused ||
    game.phase === 'resolving' || game.phase === 'spawning' ||
    game.phase === 'condensing' || game.phase === 'idle';

  // ── Swipe gestures with axis locking ───────────────────────────────────────
  // Each pan commits to one axis (horizontal OR vertical) based on its dominant
  // direction once it clears a deadzone — so a sideways swipe can never trigger
  // an accidental soft-drop, and a downward swipe won't nudge left/right.
  const axis   = useRef<'none' | 'h' | 'v'>('none');
  const accX   = useRef(0);
  const accY   = useRef(0);
  const prevX  = useRef(0);
  const prevY  = useRef(0);
  const hMovedRef = useRef(false); // track if we've made a horizontal move yet

  const DEADZONE = cellSize * 0.22; // small — axis chosen quickly so sideways feels responsive
  const H_STEP   = cellSize * 0.42; // horizontal distance per left/right move
  const H_FIRST  = cellSize * 0.32; // smaller threshold for FIRST horizontal move (responsive initial swipe)
  const V_STEP   = cellSize * 0.80; // vertical distance per soft-drop (deliberate)

  const boardGesture = Gesture.Race(
    Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => { runOnJS(rotateWithSound)(); }),
    Gesture.Pan()
      .minDistance(4)
      .onStart(() => {
        axis.current = 'none';
        accX.current = 0; accY.current = 0;
        prevX.current = 0; prevY.current = 0;
        hMovedRef.current = false;
      })
      .onUpdate(e => {
        const dx = e.translationX - prevX.current;
        const dy = e.translationY - prevY.current;
        prevX.current = e.translationX;
        prevY.current = e.translationY;

        // Choose the axis once the swipe clears the (small) deadzone. Seed the
        // accumulator with the travel so far so the FIRST move fires promptly.
        if (axis.current === 'none') {
          if (Math.abs(e.translationX) > DEADZONE || Math.abs(e.translationY) > DEADZONE) {
            if (Math.abs(e.translationX) >= Math.abs(e.translationY)) {
              axis.current = 'h';
              accX.current = e.translationX;
            } else {
              axis.current = 'v';
              accY.current = e.translationY;
            }
          } else {
            return;
          }
        } else if (axis.current === 'h') {
          accX.current += dx;
        } else {
          accY.current += dy;
        }

        if (axis.current === 'h') {
          // Use H_FIRST for first move, H_STEP for subsequent moves
          const threshold = hMovedRef.current ? H_STEP : H_FIRST;
          while (Math.abs(accX.current) >= threshold) {
            if (accX.current > 0) runOnJS(game.moveRight)();
            else runOnJS(game.moveLeft)();
            hMovedRef.current = true;
            accX.current += accX.current > 0 ? -H_STEP : H_STEP;
          }
        } else {
          // Vertical lock — soft drop step by step (downward only)
          while (accY.current >= V_STEP) {
            runOnJS(game.softDrop)();
            accY.current -= V_STEP;
          }
        }
      })
      .onEnd(e => {
        // A quick downward flick (vertical-locked) hard-drops — easy "send it down"
        if (axis.current === 'v' && e.velocityY > 900 && e.translationY > cellSize) {
          runOnJS(hardDropWithSound)();
        }
      }),
  );

  const freeContinueAvailable = isPremium && !freeContinueUsed;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Game block — vertically centered so board sits lower & balanced */}
      <View style={styles.gameArea}>
        {/* Score | Best | Next */}
        <View style={[styles.hudRow, { height: HUD_H }]}>
          <HUD
            score={game.score}
            bestScore={bestScore}
            nextPiece={game.queue[0]}
            onLogoPress={() => setPaused(true)}
          />
        </View>

        {/* Board with swipe gestures */}
        <GestureDetector gesture={controlsDisabled ? Gesture.Tap() : boardGesture}>
          <View style={[styles.boardWrap, { backgroundColor: colors.surfaceRaise }]}>
            <GameBoard
              board={game.board}
              activePiece={game.activePiece}
              ghostAnchorRow={game.ghostAnchorRow}
              cellSize={cellSize}
              chainPass={game.chainPass}
              mergeEvents={game.lastMergeEvents}
            />
            <EmergencyCondenseOverlay visible={game.phase === 'condensing'} />
          </View>
        </GestureDetector>

        {/* Controls — width matches board */}
        <View style={[styles.controlsRow, { height: CONTROLS_H, width: boardW }]}>
          <Controls
            onLeft={game.moveLeft}
            onRight={game.moveRight}
            onRotate={rotateWithSound}
            onSoftDrop={game.softDrop}
            onHardDrop={hardDropWithSound}
            onPause={() => setPaused(true)}
            disabled={controlsDisabled}
          />
        </View>
      </View>

      {/* Banner pinned at bottom — always visible */}
      {!isPremium && <AdBanner />}

      <GameOverModal
        visible={game.phase === 'gameOver'}
        score={game.score}
        bestScore={bestScore}
        prevBest={prevBest}
        freeContinueAvailable={freeContinueAvailable}
        adLoaded={adLoaded}
        onFreeContinue={handleFreeContinue}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
      />

      <PauseModal
        visible={paused}
        onResume={() => setPaused(false)}
        onContinueLater={handleSaveAndQuit}
        onNewGame={handleQuit}
      />

      <AdInterstitial visible={showInterstitial} onClose={handleInterstitialClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  gameArea:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hudRow:      { alignItems: 'center', justifyContent: 'center', width: '100%' },
  boardWrap:   { borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  controlsRow: { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
