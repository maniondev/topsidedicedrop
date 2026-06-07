import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform, BackHandler,
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
  const { bestScore, submitRun } = useStats();
  const { play } = useSound();
  const { isPremium } = usePremium();
  const { gravityMs, difficulty } = useDifficulty();
  const { width, height } = useWindowDimensions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const [paused, setPaused] = useState(false);

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
      clearSavedGame();
      game.startGame();
      return;
    }
    loadSavedGame().then(saved => {
      if (saved) {
        clearSavedGame();
        game.loadSaved(saved.board as any, saved.score, saved.queue as any, saved.runBestChain);
      } else {
        game.startGame();
      }
    }).catch(() => { game.startGame(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const continueUsed = freeContinueUsed || game.continueAvailable === false;
    submitRun(game.score, game.runBestChain, difficulty, continueUsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  useEffect(() => {
    if (game.lastMergeEvents.length === 0) return;
    play(game.lastMergeEvents.some(e => e.newValue === 'clear') ? 'clear' : 'merge');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

  // Rotate with a subtle click. Discrete action — safe for the pooled audio engine.
  const rotateWithSound = useCallback(() => {
    play('drop');
    game.rotate();
  }, [play, game.rotate]);

  // Hard drop with a satisfying "thunk" (hint.m4a). Discrete — one per piece at most.
  const hardDropWithSound = useCallback(() => {
    play('lock');
    game.hardDrop();
  }, [play, game.hardDrop]);

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

  const DEADZONE = cellSize * 0.45; // movement needed before an axis is chosen
  const H_STEP   = cellSize * 0.55; // horizontal distance per left/right move
  const V_STEP   = cellSize * 0.80; // vertical distance per soft-drop (deliberate)

  const boardGesture = Gesture.Race(
    Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => { runOnJS(rotateWithSound)(); }),
    Gesture.Pan()
      .minDistance(6)
      .onStart(() => {
        axis.current = 'none';
        accX.current = 0; accY.current = 0;
        prevX.current = 0; prevY.current = 0;
      })
      .onUpdate(e => {
        const dx = e.translationX - prevX.current;
        const dy = e.translationY - prevY.current;
        prevX.current = e.translationX;
        prevY.current = e.translationY;

        // Choose the axis once the swipe clears the deadzone
        if (axis.current === 'none') {
          if (Math.abs(e.translationX) > DEADZONE || Math.abs(e.translationY) > DEADZONE) {
            axis.current = Math.abs(e.translationX) >= Math.abs(e.translationY) ? 'h' : 'v';
          } else {
            return;
          }
        }

        if (axis.current === 'h') {
          accX.current += dx;
          while (Math.abs(accX.current) >= H_STEP) {
            if (accX.current > 0) runOnJS(game.moveRight)();
            else runOnJS(game.moveLeft)();
            accX.current += accX.current > 0 ? -H_STEP : H_STEP;
          }
        } else {
          // Vertical lock — soft drop step by step (downward only)
          accY.current += dy;
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
