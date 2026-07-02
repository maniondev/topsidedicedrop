import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, BackHandler, AppState, LayoutChangeEvent,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useDifficulty } from '@/contexts/DifficultyContext';
import { useAnimation } from '@/contexts/AnimationContext';
import { useGame } from '@/hooks/useGame';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { isFirstRunOfSession, markFirstRunUsed, resetFirstRunForQuit } from '@/lib/sessionTracker';
import GameBoard from '@/components/game/GameBoard';
import HUD from '@/components/game/HUD';
import Controls from '@/components/game/Controls';
import GameOverModal from '@/components/game/GameOverModal';
import PauseModal from '@/components/game/PauseModal';
import EmergencyCondenseOverlay from '@/components/game/EmergencyCondenseOverlay';
import { FloatingLabelsOverlay, FloatingLabelData } from '@/components/game/FloatingLabels';
import AdBanner from '@/components/AdBanner';
import { onRunComplete } from '@/lib/adCounter';
import { saveGame, loadSavedGame, clearSavedGame, savePendingRun, clearPendingRun, hasSeenControls, markControlsSeen } from '@/lib/storage';
import TutorialOverlay from '@/components/game/TutorialOverlay';
import { runMergePhase, computeClearSteps } from '@/lib/condense';
import { COLS, ROWS } from '@/constants/game';
import { submitScoreForCurrentPlayer, updateBestUnassistedForCurrentPlayer } from '@/lib/scoreQueue';
import { getReviewOptedOut, setReviewOptedOut, isReviewMilestone, openNativeReview, getReviewLastPrompted, setReviewLastPrompted, setHasRated } from '@/lib/reviewPrompt';
import ReviewPromptModal from '@/components/ReviewPromptModal';

// No tab bar in this screen — more space for the board
const HUD_H    = 96;
const BANNER_H = 60; // matches BANNER_RESERVED_H in AdBanner
const CTRL_GAP = 6;  // must match GAP in Controls.tsx
const S1       = 8;  // HUD → board (fixed px — board resizes, gaps don't)
const S2       = 12; // board → controls, controls → ad (scaled per-instance in component)

export default function GameScreen() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const { colors } = useTheme();
  const { statsFor, submitRun, submitPreContinueRun } = useStats();
  const { play, soundPack } = useSound();
  const { isPremium } = usePremium();
  const { gravityMs, difficulty } = useDifficulty();
  const { showChainPopups } = useAnimation();
  const bestScore = statsFor(difficulty).bestScore;
  const bestUnassisted = statsFor(difficulty).bestUnassisted;
  const { width: rawWidth, height } = useWindowDimensions();
  const isLargeScreen = Platform.isPad || rawWidth >= 600;
  const width = isLargeScreen ? Math.min(rawWidth, 620) : rawWidth;
  const s2 = isLargeScreen ? 24 : S2;
  const hudH = isLargeScreen ? 120 : HUD_H;
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const [paused, setPaused] = useState(false);
  const [prevBest, setPrevBest] = useState(0);
  const [floatingLabels, setFloatingLabels] = useState<FloatingLabelData[]>([]);
  const floatingLabelIdRef    = useRef(0);
  const chainStartScoreRef    = useRef(0);
  const lastMergePositionRef  = useRef<{ x: number; y: number } | null>(null);
  const popupPrevPhaseRef     = useRef<string>('');
  const [scoreGain, setScoreGain]       = useState<string | null>(null);
  const [scoreGainActive, setScoreGainActive] = useState(false);
  const scoreGainKeyRef                 = useRef(0);
  const [scoreGainKey, setScoreGainKey] = useState(0);
  const allClearCountRef                = useRef(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialShownRef                = useRef(false);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  const reviewOptedOutRef      = useRef(false);
  const reviewPendingRef       = useRef(false);
  const reviewLastPromptedRef  = useRef(0);
  const reviewPendingCountRef  = useRef(0);

  // Measured height of the gameArea container — the only reliable way to know available
  // vertical space on Android, where useWindowDimensions and useSafeAreaInsets can disagree.
  const [gameAreaH, setGameAreaH] = useState(0);
  const onGameAreaLayout = useCallback((e: LayoutChangeEvent) => {
    setGameAreaH(e.nativeEvent.layout.height);
  }, []);

  const bannerH       = isPremium ? 0 : BANNER_H;
  const spacingH      = S1 + s2 + (isPremium ? 0 : s2); // fixed gaps between sections
  const csW           = Math.floor((width - 32) / COLS);
  const approxBtnSize = Math.max(36, Math.floor((csW * COLS - CTRL_GAP * 4) / 5));
  // Use measured container height when available; fall back to dimension-based estimate for first frame.
  const nonBoardH     = hudH + approxBtnSize + bannerH + spacingH;
  const effectiveH    = gameAreaH > 0 ? gameAreaH : Math.max(0, height - safeTop - safeBottom);
  const csH           = Math.floor((effectiveH - nonBoardH) / ROWS);
  const cellSize      = Math.max(Math.min(csH, csW), 32);
  const boardW        = cellSize * COLS;

  const game = useGame(gravityMs, paused || reviewPromptVisible || showTutorial);

  const handlePause = useCallback(() => setPaused(true), []);

  const [freeContinueUsed,  setFreeContinueUsed]  = useState(false);
  const [adContinueUsed,   setAdContinueUsed]    = useState(false);
  const prevBestLockedRef = useRef(false);
  // Captures game state at the moment the player taps "Continue" (before the ad plays),
  // so the ad callback has the correct pre-continue values even with stale closure.
  const preContinueRef = useRef<{ score: number; chain: number; alreadyUsedContinue: boolean } | null>(null);
  // The score at the moment the first continue was used — stored on the final run record
  // so the "unassisted" filter can show the pre-continue leg without creating a duplicate entry.
  const preContinueScoreRef = useRef<number>(0);

  // On mount: start fresh if ?fresh=1, otherwise resume a saved game if one exists
  useEffect(() => {
    if (fresh === '1') {
      clearSavedGame(difficulty);
      game.startGame();
      return;
    }
    loadSavedGame(difficulty).then(saved => {
      if (saved && Array.isArray(saved.board) && Array.isArray(saved.queue)) {
        clearSavedGame(difficulty);
        game.loadSaved(saved.board as any, saved.score, saved.queue as any, saved.runBestChain, saved.activePiece as any);
      } else {
        game.startGame();
      }
    }).catch(() => { game.startGame(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if controls tutorial has been seen.
  useEffect(() => {
    hasSeenControls().then(seen => { if (!seen) tutorialShownRef.current = false; else tutorialShownRef.current = true; });
  }, []);

  // Show tutorial on first falling phase.
  useEffect(() => {
    if (tutorialShownRef.current) return;
    if (game.phase === 'falling' || game.phase === 'locking') {
      tutorialShownRef.current = true;
      setShowTutorial(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Load review opt-out + last-prompted once on mount.
  useEffect(() => {
    getReviewOptedOut().then(v  => { reviewOptedOutRef.current = v; });
    getReviewLastPrompted().then(n => { reviewLastPromptedRef.current = n; });
  }, []);

  // When the game-over modal closes (phase leaves 'gameOver'), show review if pending.
  const prevPhaseWasGameOver = useRef(false);
  useEffect(() => {
    if (prevPhaseWasGameOver.current && game.phase !== 'gameOver') {
      if (reviewPendingRef.current && !reviewOptedOutRef.current) {
        reviewPendingRef.current = false;
        reviewLastPromptedRef.current = reviewPendingCountRef.current;
        setReviewLastPrompted(reviewPendingCountRef.current);
        setReviewPromptVisible(true);
      }
    }
    prevPhaseWasGameOver.current = game.phase === 'gameOver';
  }, [game.phase]);

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

  // Floating chain/score popups ─────────────────────────────────────────────
  const addFloatingLabel = useCallback((
    type: 'chain' | 'score',
    text: string, x: number, y: number, color: string, fontSize: number,
    rotation: number, fontFamily?: string, travelY?: number, glowColor?: string,
  ) => {
    const id = String(floatingLabelIdRef.current++);
    setFloatingLabels(prev => [
      // Chain labels: only ever one on screen — replace any existing chain label
      ...(type === 'chain' ? prev.filter(l => l.type !== 'chain') : prev),
      { id, type, text, x, y, color, fontSize, rotation, fontFamily, travelY, glowColor },
    ]);
  }, []);

  const removeFloatingLabel = useCallback((id: string) => {
    setFloatingLabels(prev => prev.filter(l => l.id !== id));
  }, []);

  // Chain score popup + running score gain: fires on each merge pass
  useEffect(() => {
    const events = game.lastMergeEvents;
    if (events.length === 0) return;
    const pass = game.chainPass;
    const [destRow, destCol] = events[0].dest;
    const x = destCol * cellSize + cellSize * 0.5;
    const y = Math.max(destRow * cellSize - cellSize * 1.1, 4);
    lastMergePositionRef.current = { x, y };
    const gain = game.score - chainStartScoreRef.current;
    if (gain > 0) {
      const rot = (Math.random() - 0.5) * 40;
      addFloatingLabel('chain', `+${gain.toLocaleString()}`, x, y, colors.accent, 42, rot, 'Rubik_700Bold', undefined, colors.popupOutlineColor ?? colors.titleColor ?? 'rgba(0,0,0,0.88)');
    }
    if (gain > 0) {
      setScoreGain(`+${gain.toLocaleString()}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.lastMergeEvents]);

  // Score gain lifecycle: start on chain begin, fade on chain end
  useEffect(() => {
    const prev = popupPrevPhaseRef.current;
    popupPrevPhaseRef.current = game.phase;
    if (game.phase === 'resolving' && prev !== 'resolving') {
      chainStartScoreRef.current = game.score;
      scoreGainKeyRef.current += 1;
      setScoreGainKey(scoreGainKeyRef.current);
      setScoreGain(null);
      setScoreGainActive(true);
    }
    if (prev === 'resolving' && game.phase === 'spawning') {
      // Capture final gain including any all-clear bonus added in the same state update
      const gain = game.score - chainStartScoreRef.current;
      if (gain > 0) setScoreGain(`+${gain.toLocaleString()}`);
      setScoreGainActive(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Unmount score gain popup after fade completes
  useEffect(() => {
    if (scoreGainActive) return;
    const t = setTimeout(() => setScoreGain(null), 1200);
    return () => clearTimeout(t);
  }, [scoreGainActive]);

  // All Clear bonus popup — both labels added atomically so they don't erase each other
  useEffect(() => {
    if (game.allClearCount <= allClearCountRef.current) {
      allClearCountRef.current = game.allClearCount; // sync on game reset
      return;
    }
    allClearCountRef.current = game.allClearCount;
    const cx = boardW / 2;
    const cy = (cellSize * ROWS) / 2 - cellSize;
    const id1 = String(floatingLabelIdRef.current++);
    const id2 = String(floatingLabelIdRef.current++);
    setFloatingLabels(prev => [
      ...prev.filter(l => l.type !== 'chain'),
      { id: id1, type: 'chain', text: 'ALL CLEAR', x: cx, y: cy - cellSize * 0.6, color: colors.accent, fontSize: 46, rotation: -4, fontFamily: 'Fredoka_700Bold', travelY: -60, glowColor: colors.popupOutlineColor ?? colors.titleColor ?? 'rgba(0,0,0,0.88)' },
      { id: id2, type: 'chain', text: '+200',      x: cx, y: cy + cellSize * 0.55, color: colors.accent, fontSize: 34, rotation:  3, fontFamily: 'Fredoka_600SemiBold', travelY: -60, glowColor: colors.popupOutlineColor ?? colors.titleColor ?? 'rgba(0,0,0,0.88)' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.allClearCount]);

  const { showInterstitial } = useInterstitialAd();
  const { showAdWithFallback } = useRewardedAd(useCallback(() => {
    // Ad rewarded — submit pre-continue score as unassisted (if no continue was used before)
    const pre = preContinueRef.current;
    if (pre && !pre.alreadyUsedContinue) {
      submitPreContinueRun(pre.score, pre.chain, difficulty);
      if (pre.score > 0) {
        updateBestUnassistedForCurrentPlayer({ p_score: pre.score, p_difficulty: difficulty });
        preContinueScoreRef.current = pre.score;
      }
    }
    preContinueRef.current = null;
    clearPendingRun(); // game is resuming, pending run is no longer valid
    setAdContinueUsed(true);
    game.startCondense();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.startCondense, difficulty]));

  useEffect(() => {
    if (game.phase !== 'gameOver') return;
    play('gameover');
    // Only capture prevBest on the first game-over of the run; a continue + second death
    // must not overwrite it (bestScore is stale until submitRun is called on New Game).
    if (!prevBestLockedRef.current) {
      setPrevBest(bestScore);
      prevBestLockedRef.current = true;
    }
    // Persist to AsyncStorage so a score is never lost if the app is killed before
    // the player taps New Game. Consumed on next launch by StatsContext.
    savePendingRun({
      score:             game.score,
      chain:             game.runBestChain,
      difficulty,
      continueUsed:      freeContinueUsed || adContinueUsed,
      preContinueScore:  preContinueScoreRef.current || undefined,
    });
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
      if (soundPack === 'fight') {
        const punch = Math.random() < 0.5 ? 'drop' : 'lock';
        const delay = Math.floor(Math.random() * 80);
        setTimeout(() => play(punch), delay);
      }
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

  // Hard drop. Lock sound plays on any lock (natural or hard drop).
  const hardDropWithSound = useCallback(() => {
    game.hardDrop();
  }, [game.hardDrop]);

  const handleFreeContinue = useCallback(() => {
    const alreadyUsedContinue = freeContinueUsed || adContinueUsed;
    // Only update bestUnassisted and submit to unassisted leaderboard on the first continue —
    // scores earned after a continue are no longer unassisted.
    if (!alreadyUsedContinue) {
      submitPreContinueRun(game.score, game.runBestChain, difficulty);
      if (game.score > 0) {
        updateBestUnassistedForCurrentPlayer({ p_score: game.score, p_difficulty: difficulty });
        preContinueScoreRef.current = game.score;
      }
    }
    clearPendingRun(); // game is resuming, pending run is no longer valid
    setFreeContinueUsed(true);
    game.startCondense();
  }, [game.score, game.runBestChain, difficulty, freeContinueUsed, adContinueUsed, submitPreContinueRun, game.startCondense]);

  const handleContinue = useCallback(() => {
    // Capture score NOW before the ad plays — the ad callback closure may be stale
    preContinueRef.current = { score: game.score, chain: game.runBestChain, alreadyUsedContinue: freeContinueUsed || adContinueUsed };
    showAdWithFallback();
  }, [showAdWithFallback, game.score, game.runBestChain, freeContinueUsed, adContinueUsed]);

  const handleNewGame = useCallback(() => {
    setPaused(false);
    onRunComplete();
    const continueUsed = freeContinueUsed || adContinueUsed;
    submitRun(game.score, game.runBestChain, difficulty, continueUsed, preContinueScoreRef.current || undefined);
    if (game.score > 0) {
      submitScoreForCurrentPlayer({ p_score: game.score, p_best_chain: game.runBestChain, p_difficulty: difficulty, p_used_continue: continueUsed, p_pre_continue_score: preContinueScoreRef.current || 0 });
    }
    clearPendingRun();
    preContinueScoreRef.current = 0;

    // Check review milestone using total runs across all difficulties (+1 for this run).
    const totalRuns = (['easy', 'medium', 'hard'] as const)
      .reduce((sum, d) => sum + statsFor(d).totalRuns, 0) + 1;
    if (
      !reviewOptedOutRef.current &&
      isReviewMilestone(totalRuns) &&
      totalRuns > reviewLastPromptedRef.current
    ) {
      reviewPendingRef.current = true;
      reviewPendingCountRef.current = totalRuns;
    }

    setFreeContinueUsed(false);
    setAdContinueUsed(false);
    prevBestLockedRef.current = false;

    const isFirst = isFirstRunOfSession();
    markFirstRunUsed();

    if (!isPremium && !isFirst) {
      showInterstitial(() => game.resetGame());
    } else {
      game.resetGame();
    }
  }, [game.score, game.runBestChain, difficulty, freeContinueUsed, adContinueUsed, submitRun, statsFor, game.resetGame, isPremium, showInterstitial]);

  const handleGoHome = useCallback(() => {
    const continueUsed = freeContinueUsed || adContinueUsed;
    submitRun(game.score, game.runBestChain, difficulty, continueUsed, preContinueScoreRef.current || undefined);
    if (game.score > 0) {
      submitScoreForCurrentPlayer({ p_score: game.score, p_best_chain: game.runBestChain, p_difficulty: difficulty, p_used_continue: continueUsed, p_pre_continue_score: preContinueScoreRef.current || 0 });
    }
    clearPendingRun();
    preContinueScoreRef.current = 0;
    setFreeContinueUsed(false);
    setAdContinueUsed(false);
    prevBestLockedRef.current = false;
    markFirstRunUsed();
    game.resetGame();
    router.back();
  }, [game.score, game.runBestChain, difficulty, freeContinueUsed, adContinueUsed, submitRun, game.resetGame]);

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

    const snapshot = game.board;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: merge until stable (instant, no sound)
    const { stableBoard, scoreGained: mergeScore } = runMergePhase(snapshot);
    game.updateCondenseBoard(stableBoard, mergeScore);

    // Phase 2: clear rows one at a time, playing merge1→merge6 sequentially
    const steps = computeClearSteps(stableBoard);
    const STEP_MS = 280;

    steps.forEach((step, i) => {
      const t = setTimeout(() => {
        const mergeSounds = ['merge1', 'merge2', 'merge3', 'merge4', 'merge5', 'merge6'] as const;
        play(mergeSounds[Math.min(i, mergeSounds.length - 1)]);
        game.updateCondenseBoard(step.board, step.scoreGained);
      }, (i + 1) * STEP_MS);
      timers.push(t);
    });

    // Finish after all steps complete
    const finalDelay = (steps.length + 1) * STEP_MS;
    const tEnd = setTimeout(() => {
      const lastBoard = steps.length > 0 ? steps[steps.length - 1].board : stableBoard;
      game.finishCondense(lastBoard, 0);
    }, finalDelay);
    timers.push(tEnd);

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  // Save game and return to lobby — run is not over, clear pending so it isn't
  // committed on next launch as an abandoned score.
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
    clearPendingRun();
    router.back();
  }, [game.exportState, difficulty]);

  // Quit without saving — commit the run right now, then leave.
  const handleQuitAndLog = useCallback(async () => {
    if (game.score > 0) {
      const continueUsed = freeContinueUsed || adContinueUsed;
      await submitRun(game.score, game.runBestChain, difficulty, continueUsed, preContinueScoreRef.current || undefined);
      submitScoreForCurrentPlayer({ p_score: game.score, p_best_chain: game.runBestChain, p_difficulty: difficulty, p_used_continue: continueUsed, p_pre_continue_score: preContinueScoreRef.current || 0 });
    }
    await clearSavedGame(difficulty);
    clearPendingRun();
    preContinueScoreRef.current = 0;
    resetFirstRunForQuit();
    router.back();
  }, [game.score, game.runBestChain, difficulty, freeContinueUsed, adContinueUsed, submitRun]);

  // Quit without saving — discard score entirely, no stats recorded
  const handleQuitDiscard = useCallback(async () => {
    await clearSavedGame(difficulty);
    resetFirstRunForQuit();
    router.back();
  }, [difficulty]);

  const controlsDisabled =
    paused || reviewPromptVisible ||
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

  const boardGesture = useMemo(() => {
    const deadzone = cellSize * 0.22;
    const hStep    = cellSize * 0.42;
    const hFirst   = cellSize * 0.32;
    const vStep    = cellSize * 0.80;
    return Gesture.Race(
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
            if (Math.abs(e.translationX) > deadzone || Math.abs(e.translationY) > deadzone) {
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
            // Use hFirst for first move, hStep for subsequent moves
            const threshold = hMovedRef.current ? hStep : hFirst;
            while (Math.abs(accX.current) >= threshold) {
              if (accX.current > 0) runOnJS(game.moveRight)();
              else runOnJS(game.moveLeft)();
              hMovedRef.current = true;
              accX.current += accX.current > 0 ? -hStep : hStep;
            }
          } else {
            // Vertical lock — soft drop step by step (downward only)
            while (accY.current >= vStep) {
              runOnJS(game.softDrop)();
              accY.current -= vStep;
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
  }, [rotateWithSound, hardDropWithSound, game.moveLeft, game.moveRight, game.softDrop, cellSize]);

  const freeContinueAvailable = isPremium;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* All game content in one column — equal flex spacers give identical gaps
          between every section (HUD ↔ board ↔ controls ↔ ad). When the ad is
          absent (premium) the spacers grow and the board expands on tight screens. */}
      <View style={styles.gameArea} onLayout={onGameAreaLayout}>
        <View style={[styles.hudRow, { height: hudH }]}>
          <HUD
            score={game.score}
            bestScore={(freeContinueUsed || adContinueUsed) ? bestScore : bestUnassisted}
            nextPiece={game.queue[0]}
            onLogoPress={handlePause}
            isLarge={isLargeScreen}
            scoreGain={scoreGain}
            scoreGainKey={scoreGainKey}
            scoreGainActive={scoreGainActive}
          />
        </View>

        <View style={{ height: S1 }} />

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
            {showChainPopups && (
              <FloatingLabelsOverlay
                labels={floatingLabels.filter(l => l.type === 'chain')}
                onRemove={removeFloatingLabel}
              />
            )}
          </View>
        </GestureDetector>
        {showTutorial && (
          <TutorialOverlay onDismiss={() => { setShowTutorial(false); markControlsSeen(); }} />
        )}


        <View style={{ height: s2 }} />

        <View style={{ width: boardW }}>
          <Controls
            onLeft={game.moveLeft}
            onRight={game.moveRight}
            onRotate={rotateWithSound}
            onSoftDrop={game.softDrop}
            onHardDrop={hardDropWithSound}
            onPause={handlePause}
            disabled={controlsDisabled}
            boardW={boardW}
          />
        </View>

        {!isPremium && <View style={{ height: s2 }} />}
        {!isPremium && <AdBanner />}
      </View>

      <GameOverModal
        visible={game.phase === 'gameOver'}
        score={game.score}
        bestScore={bestScore}
        prevBest={prevBest}
        freeContinueAvailable={freeContinueAvailable}
        onFreeContinue={handleFreeContinue}
        onContinue={handleContinue}
        onNewGame={handleNewGame}
        onHome={handleGoHome}
        showAdNotice={!isPremium && !isFirstRunOfSession()}
      />

      <PauseModal
        visible={paused}
        onResume={() => setPaused(false)}
        onContinueLater={handleSaveAndQuit}
        onQuitAndLog={handleQuitAndLog}
        onQuitDiscard={handleQuitDiscard}
        hasProgress={game.score > 0 || game.board.some(row => row.some(cell => cell !== null))}
      />

      <ReviewPromptModal
        visible={reviewPromptVisible}
        onRate={() => {
          setReviewPromptVisible(false);
          reviewOptedOutRef.current = true;
          setReviewOptedOut();
          setHasRated();
          openNativeReview();
        }}
        onLater={() => {
          setReviewPromptVisible(false);
        }}
        onDontAsk={() => {
          setReviewPromptVisible(false);
          reviewOptedOutRef.current = true;
          setReviewOptedOut();
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  gameArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  hudRow:   { alignItems: 'center', justifyContent: 'center', width: '100%' },
  boardWrap:{ borderRadius: 4, overflow: 'hidden' },
});
