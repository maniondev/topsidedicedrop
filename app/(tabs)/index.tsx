import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useGame } from '@/hooks/useGame';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import GameBoard from '@/components/game/GameBoard';
import HUD from '@/components/game/HUD';
import Controls from '@/components/game/Controls';
import GameOverModal from '@/components/game/GameOverModal';
import EmergencyCondenseOverlay from '@/components/game/EmergencyCondenseOverlay';
import AdBanner from '@/components/AdBanner';
import AdInterstitial from '@/components/AdInterstitial';
import AppLogo from '@/components/AppLogo';
import { onRunComplete } from '@/lib/adCounter';
import { Board } from '@/lib/board';
import { COLS, ROWS } from '@/constants/game';

const HEADER_H   = 52;
const HUD_H      = 50;
const CONTROLS_H = 76;
const BANNER_H   = 52;
const TAB_BAR_H  = 60;
const V_PAD      = 16;

export default function PlayScreen() {
  const { colors } = useTheme();
  const { bestScore, submitRun } = useStats();
  const { play } = useSound();
  const { isPremium } = usePremium();
  const { width, height } = useWindowDimensions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const tabBarH  = TAB_BAR_H + Math.max(safeBottom, Platform.OS === 'android' ? 28 : 8);
  const usedH    = safeTop + tabBarH + HEADER_H + HUD_H + CONTROLS_H + BANNER_H + V_PAD;
  const availH   = height - usedH;
  const csH      = Math.floor(availH / ROWS);
  const csW      = Math.floor((width - 32) / COLS);
  const cellSize = Math.max(Math.min(csH, csW), 32);

  const boardW = cellSize * COLS;

  const game = useGame();
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingNewGame, setPendingNewGame]      = useState(false);

  const { adLoaded, showAd } = useRewardedAd(useCallback(() => {
    game.startCondense();
  }, [game.startCondense]));

  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    play('gameover');
    submitRun(game.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  useEffect(() => {
    if (game.lastMergeEvents.length === 0) return;
    play(game.lastMergeEvents.some(e => e.newValue === 'clear') ? 'clear' : 'merge');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

  const handleContinue = useCallback(() => {
    if (adLoaded) showAd();
  }, [adLoaded, showAd]);

  const handleNewGame = useCallback(() => {
    if (onRunComplete() && !isPremium) {
      setPendingNewGame(true);
      setShowInterstitial(true);
    } else {
      game.resetGame();
    }
  }, [isPremium, game.resetGame]);

  const handleInterstitialClose = useCallback(() => {
    setShowInterstitial(false);
    if (pendingNewGame) { setPendingNewGame(false); game.resetGame(); }
  }, [pendingNewGame, game.resetGame]);

  const handleCondenseComplete = useCallback((board: Board, scoreGained: number) => {
    game.finishCondense(board, scoreGained);
  }, [game.finishCondense]);

  const controlsDisabled =
    game.phase === 'resolving' || game.phase === 'spawning' ||
    game.phase === 'condensing' || game.phase === 'idle';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Header: centered logo + title */}
      <View style={[styles.header, { height: HEADER_H }]}>
        <AppLogo size={24} />
        <Text style={{ fontSize: 17, color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }}>
          Topside: Merge
        </Text>
      </View>

      {/* Score | Best | Next — all inline */}
      <View style={[styles.hudRow, { height: HUD_H }]}>
        <HUD score={game.score} bestScore={bestScore} nextPiece={game.queue[0]} />
      </View>

      {/* Board */}
      <View style={[styles.boardWrap, { backgroundColor: colors.surfaceRaise, alignSelf: 'center' }]}>
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

      {/* Controls — same width as board so rotate sits at board center */}
      <View style={[styles.controlsRow, { height: CONTROLS_H, width: boardW }]}>
        <Controls
          onLeft={game.moveLeft}
          onRight={game.moveRight}
          onRotate={game.rotate}
          onSoftDrop={game.softDrop}
          onHardDrop={game.hardDrop}
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
        continueAvailable={adLoaded}
        adLoaded={adLoaded}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
      />

      <AdInterstitial visible={showInterstitial} onClose={handleInterstitialClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, alignItems: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  width: '100%', gap: 8 },
  hudRow:       { alignItems: 'center', justifyContent: 'center', width: '100%' },
  boardWrap:    { borderRadius: 4, overflow: 'hidden' },
  controlsRow:  { alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  startBtn:     { paddingHorizontal: 48, paddingVertical: 18, borderRadius: 16 },
  startBtnText: { fontSize: 22, fontWeight: '700' },
});
