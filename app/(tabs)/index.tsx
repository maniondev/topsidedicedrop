import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Board } from '@/lib/board';
import { COLS, ROWS } from '@/constants/game';

const HEADER_H   = 0;
const HUD_H      = 72;
const CONTROLS_H = 76;
const BANNER_H   = 52;
const TAB_BAR_H  = 60;
const V_PAD      = 16;

export default function PlayScreen() {
  const { colors } = useTheme();
  const { bestScore, submitRun } = useStats();
  const { play } = useSound();
  const { isPremium } = usePremium();
  const { gravityMs, difficulty } = useDifficulty();
  const { width, height } = useWindowDimensions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const tabBarH  = TAB_BAR_H + Math.max(safeBottom, Platform.OS === 'android' ? 28 : 8);
  const bannerH  = isPremium ? 0 : BANNER_H;
  const usedH    = safeTop + tabBarH + HEADER_H + HUD_H + CONTROLS_H + bannerH + V_PAD;
  const availH   = height - usedH;
  const csH      = Math.floor(availH / ROWS);
  const csW      = Math.floor((width - 32) / COLS);
  const cellSize = Math.max(Math.min(csH, csW), 32);
  const boardW   = cellSize * COLS;

  const game = useGame(gravityMs);

  const [paused,            setPaused]            = useState(false);
  const [showInterstitial,  setShowInterstitial]  = useState(false);
  const [pendingNewGame,    setPendingNewGame]     = useState(false);
  const [freeContinueUsed,  setFreeContinueUsed]  = useState(false);

  // Reset free-continue flag on new game
  useEffect(() => {
    if (game.phase === 'idle') setFreeContinueUsed(false);
  }, [game.phase]);

  const { adLoaded, showAd } = useRewardedAd(useCallback(() => {
    game.startCondense();
  }, [game.startCondense]));

  // On game over: submit stats, maybe show interstitial
  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    play('gameover');
    submitRun(game.score, game.runBestChain, difficulty, freeContinueUsed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  useEffect(() => {
    if (game.lastMergeEvents.length === 0) return;
    play(game.lastMergeEvents.some(e => e.newValue === 'clear') ? 'clear' : 'merge');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

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

  const handleCondenseComplete = useCallback((board: Board, scoreGained: number) => {
    game.finishCondense(board, scoreGained);
  }, [game.finishCondense]);

  const controlsDisabled =
    paused ||
    game.phase === 'resolving' || game.phase === 'spawning' ||
    game.phase === 'condensing' || game.phase === 'idle';

  // ── Swipe gestures on board ───────────────────────────────────────────────
  const accX   = useRef(0);
  const accY   = useRef(0);
  const prevX  = useRef(0);
  const prevY  = useRef(0);
  const thresh = cellSize * 0.65;

  const boardGesture = Gesture.Race(
    Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => { runOnJS(game.rotate)(); }),
    Gesture.Pan()
      .minDistance(8)
      .onStart(() => { accX.current = 0; accY.current = 0; prevX.current = 0; prevY.current = 0; })
      .onUpdate(e => {
        const dx = e.translationX - prevX.current;
        const dy = e.translationY - prevY.current;
        prevX.current = e.translationX;
        prevY.current = e.translationY;
        accX.current += dx;
        accY.current += dy;
        if (Math.abs(accX.current) >= thresh) {
          if (accX.current > 0) runOnJS(game.moveRight)();
          else runOnJS(game.moveLeft)();
          accX.current = 0;
        }
        if (accY.current >= thresh) {
          runOnJS(game.softDrop)();
          accY.current = 0;
        }
      })
      .onEnd(e => {
        if (e.velocityY > 1200 && Math.abs(e.translationX) < 60) {
          runOnJS(game.hardDrop)();
        }
      }),
  );

  const freeContinueAvailable = isPremium && !freeContinueUsed;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Score | Best | Next */}
      <View style={[styles.hudRow, { height: HUD_H }]}>
        <HUD score={game.score} bestScore={bestScore} nextPiece={game.queue[0]} />
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
          <EmergencyCondenseOverlay
            visible={game.phase === 'condensing'}
            board={game.board}
            onComplete={handleCondenseComplete}
          />
        </View>
      </GestureDetector>

      {/* Controls — same width as board so pause/down align with edges */}
      <View style={[styles.controlsRow, { height: CONTROLS_H, width: boardW }]}>
        <Controls
          onLeft={game.moveLeft}
          onRight={game.moveRight}
          onRotate={game.rotate}
          onSoftDrop={game.softDrop}
          onHardDrop={game.hardDrop}
          onPause={() => setPaused(true)}
          disabled={controlsDisabled}
        />
      </View>

      {/* Start overlay */}
      {game.phase === 'idle' && (
        <View style={styles.startOverlay}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.accent }]}
            onPress={game.startGame}
          >
            <Text style={[styles.startBtnText, { color: colors.accentText }]}>Tap to Play</Text>
          </TouchableOpacity>
        </View>
      )}

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
        onNewGame={handleNewGame}
      />

      <AdInterstitial visible={showInterstitial} onClose={handleInterstitialClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, alignItems: 'center' },
  hudRow:       { alignItems: 'center', justifyContent: 'center', width: '100%' },
  boardWrap:    { borderRadius: 4, overflow: 'hidden' },
  controlsRow:  { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  startBtn:     { paddingHorizontal: 48, paddingVertical: 18, borderRadius: 16 },
  startBtnText: { fontSize: 22, fontWeight: '700' },
});
