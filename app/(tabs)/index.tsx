import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useGame } from '@/hooks/useGame';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import GameBoard from '@/components/game/GameBoard';
import NextQueue from '@/components/game/NextQueue';
import HUD from '@/components/game/HUD';
import Controls from '@/components/game/Controls';
import GameOverModal from '@/components/game/GameOverModal';
import EmergencyCondenseOverlay from '@/components/game/EmergencyCondenseOverlay';
import AdBanner from '@/components/AdBanner';
import AdInterstitial from '@/components/AdInterstitial';
import AppLogo from '@/components/AppLogo';
import { onRunComplete } from '@/lib/adCounter';
import { Board } from '@/lib/board';

export default function PlayScreen() {
  const { colors } = useTheme();
  const { bestScore, submitRun } = useStats();
  const { play } = useSound();
  const { isPremium } = usePremium();

  const game = useGame();
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingNewGame, setPendingNewGame] = useState(false);

  // Rewarded ad for Emergency Condense
  const { adLoaded, showAd } = useRewardedAd(useCallback(() => {
    game.startCondense();
  }, [game.startCondense]));

  // Submit score and maybe show interstitial when game ends
  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    play('gameover');
    submitRun(game.score);
    if (onRunComplete() && !isPremium) setShowInterstitial(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Sound effects on merge events
  useEffect(() => {
    if (game.lastMergeEvents.length === 0) return;
    const hasClear = game.lastMergeEvents.some(e => e.newValue === 'clear');
    if (hasClear) play('clear');
    else play('merge');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

  const handleContinue = useCallback(() => {
    if (adLoaded) showAd();
  }, [adLoaded, showAd]);

  const handleNewGame = useCallback(() => {
    setPendingNewGame(true);
  }, []);

  const handleInterstitialClose = useCallback(() => {
    setShowInterstitial(false);
    if (pendingNewGame) { setPendingNewGame(false); game.resetGame(); }
  }, [pendingNewGame, game.resetGame]);

  const handleCondenseComplete = useCallback((board: Board, scoreGained: number) => {
    game.finishCondense(board, scoreGained);
  }, [game.finishCondense]);

  const isPlaying = game.phase !== 'idle' && game.phase !== 'gameOver';
  const controlsDisabled = game.phase === 'resolving' || game.phase === 'spawning' ||
    game.phase === 'condensing' || game.phase === 'idle';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppLogo size={30} />
        <Text style={[styles.titleText, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Topside: Merge
        </Text>
      </View>

      <View style={styles.hud}>
        <HUD score={game.score} bestScore={bestScore} />
      </View>

      <View style={[styles.boardWrap, { backgroundColor: colors.surfaceRaise }]}>
        <GameBoard
          board={game.board}
          activePiece={game.activePiece}
          ghostAnchorRow={game.ghostAnchorRow}
        />
        <EmergencyCondenseOverlay
          visible={game.phase === 'condensing'}
          board={game.board}
          onComplete={handleCondenseComplete}
        />
      </View>

      <View style={styles.footer}>
        <NextQueue queue={game.queue} />
        <Controls
          onLeft={game.moveLeft}
          onRight={game.moveRight}
          onRotate={game.rotate}
          onSoftDrop={game.softDrop}
          onHardDrop={game.hardDrop}
          disabled={controlsDisabled}
        />
      </View>

      {game.phase === 'idle' && (
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.accent }]}
          onPress={game.startGame}
        >
          <Text style={[styles.startBtnText, { color: colors.accentText }]}>Tap to Play</Text>
        </TouchableOpacity>
      )}

      {!isPremium && <AdBanner />}

      <GameOverModal
        visible={game.phase === 'gameOver'}
        score={game.score}
        bestScore={bestScore}
        continueAvailable={game.continueAvailable}
        adLoaded={adLoaded}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
      />

      <AdInterstitial
        visible={showInterstitial}
        onClose={handleInterstitialClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  titleText: { fontSize: 20 },
  hud: { paddingVertical: 6 },
  boardWrap: {
    alignSelf: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  footer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
    gap: 12,
  },
  startBtn: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    transform: [{ translateY: -24 }],
  },
  startBtnText: { fontSize: 20, fontWeight: '700' },
});
