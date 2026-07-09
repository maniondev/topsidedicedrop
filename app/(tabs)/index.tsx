import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, useWindowDimensions, Platform, Dimensions, AppState,
} from 'react-native';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useSound } from '@/contexts/SoundContext';
import { useMusic } from '@/contexts/MusicContext';
import AppLogo from '@/components/AppLogo';
import HowToPlayModal from '@/components/HowToPlayModal';
import PremiumModal from '@/components/PremiumModal';
import SpinningLabel from '@/components/SpinningLabel';
import PulsingCard from '@/components/PulsingCard';
import FlyingTitleUnit from '@/components/FlyingTitleUnit';
import AnimatedDivider from '@/components/AnimatedDivider';
import { loadSavedGame } from '@/lib/storage';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useMusicIdleTier } from '@/hooks/useMusicIdleTier';
import { isFirstRunOfSession, markFirstRunUsed } from '@/lib/sessionTracker';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
];

// "Topside: Dice Drop" as eighth-note-timed flying units: T-o-p-s-i-d-e:
// letter by letter, an eighth-note rest, "Dice" as one unit, a 3-eighth-note
// rest, "Drop" as one unit, then a 3-eighth-note rest before the loop
// repeats. Each word's leading space rides along with it so the
// reconstructed string reads correctly.
const TITLE_TOTAL_SLOTS = 16;
const TITLE_UNITS: { index: number; text: string; kind: 'topside' | 'diceDrop' }[] = [
  { index: 0, text: 'T',  kind: 'topside' },
  { index: 1, text: 'o',  kind: 'topside' },
  { index: 2, text: 'p',  kind: 'topside' },
  { index: 3, text: 's',  kind: 'topside' },
  { index: 4, text: 'i',  kind: 'topside' },
  { index: 5, text: 'd',  kind: 'topside' },
  { index: 6, text: 'e:', kind: 'topside' },
  { index: 8, text: ' Dice', kind: 'diceDrop' },
  { index: 12, text: ' Drop', kind: 'diceDrop' },
];

export default function LobbyScreen() {
  const { colors } = useTheme();
  const { statsFor, stats } = useStats();
  const { difficulty, setDifficulty } = useDifficulty();
  const { hasCustomization, hasNoAds } = usePremium();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { musicEnabled, setMusicEnabled, devMusicIncluded, musicSyncStartedAt, menuLoopDurationMs, musicSyncEpoch, musicLoopStartedAt } = useMusic();
  const { top } = useSafeAreaInsets();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [howToIsFirstOpen, setHowToIsFirstOpen] = useState(false);
  const { showInterstitial } = useInterstitialAd();

  // ALL home animations (logo sway, word flip, stats pulse, title fly,
  // divider comets) stop while this screen is blurred — game or tab switch
  // — and resume instantly phase-correct on focus: everything anchors to
  // absolute loop-grid timestamps, so "where they should be" is just
  // recomputed from the epoch, no background running needed. This also
  // keeps the sway/flip from burning UI-thread frames behind the game
  // screen for a whole session. homeAnimEpoch feeds only the idle-tier
  // thresholds, which persist across blurs (leave and come back at tier 2,
  // it's still tier 2).
  const [homeAnimEpoch, setHomeAnimEpoch] = useState(musicSyncStartedAt);
  const [homeAnimActive, setHomeAnimActive] = useState(true);
  const wasBlurredRef = useRef(false);
  // The musicSyncStartedAt value the current homeAnimEpoch derives from —
  // lets the resume path detect "the track restarted while this screen was
  // blurred" (epoch stale, must re-sync) without resetting the idle-tier
  // escalation on ordinary blurs where nothing changed.
  const epochBaseRef = useRef(0);
  // Mirrored in refs so the useFocusEffect callback below never changes
  // identity — react-navigation treats a changed callback like a
  // blur+refocus, and these two values legitimately change during the
  // cold-launch sequence *while the Home screen stays focused the whole
  // time*, which was wrongly triggering a full suspend-and-wait-for-loop.
  const musicSyncStartedAtRef = useRef(musicSyncStartedAt);
  musicSyncStartedAtRef.current = musicSyncStartedAt;

  useEffect(() => {
    if (!wasBlurredRef.current) {
      setHomeAnimEpoch(musicSyncStartedAt);
      epochBaseRef.current = musicSyncStartedAt;
    }
  }, [musicSyncStartedAt]);

  useFocusEffect(
    useCallback(() => {
      if (wasBlurredRef.current) {
        wasBlurredRef.current = false;
        const startedAt = musicSyncStartedAtRef.current;
        // Resume immediately, phase-correct — the loop-anchored epochs make
        // "where the animations should be" a pure computation. Keep the
        // tier epoch unless the track restarted while blurred (e.g.
        // backgrounding mid-game reloads it), in which case re-sync.
        if (epochBaseRef.current !== startedAt) {
          setHomeAnimEpoch(startedAt);
          epochBaseRef.current = startedAt;
        }
        setHomeAnimActive(true);
      }

      return () => {
        // Losing focus (game or tab switch) — stop everything immediately.
        wasBlurredRef.current = true;
        setHomeAnimActive(false);
      };
    }, []),
  );

  // Suspends ALL home animations (including the always-on logo sway and
  // word flip) across an app background→foreground trip. Without this, the
  // animations resume instantly against the stale pre-background epoch
  // while the music spends ~0.5-1s reloading, then visibly snap when the
  // fresh epoch lands. Cleared by the epoch bump itself (music verifiably
  // restarted), immediately when no music will play, or by a safety
  // timeout in case the music reload fails and no bump ever comes.
  const [appResuming, setAppResuming] = useState(false);
  const resumeSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const musicWillResumeRef = useRef(false);
  musicWillResumeRef.current = musicEnabled && devMusicIncluded;

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        // Always suspend on background, music or not — so returning never
        // lands mid-animation. With music on, the release waits for the
        // track to restart (below); with music off, the constant anims
        // (sway, flip) restart fresh from now the moment we resume, because
        // their active/animated prop flips off→on and re-runs their effect.
        setAppResuming(true);
      } else {
        if (!musicWillResumeRef.current) {
          setAppResuming(false);
        } else {
          if (resumeSafetyRef.current) clearTimeout(resumeSafetyRef.current);
          resumeSafetyRef.current = setTimeout(() => setAppResuming(false), 4000);
        }
      }
    });
    return () => {
      sub.remove();
      if (resumeSafetyRef.current) clearTimeout(resumeSafetyRef.current);
    };
  }, []);

  useEffect(() => {
    // Fresh epoch = music actually restarted from the top — release the
    // suspension so everything starts together, locked to the new grid.
    if (resumeSafetyRef.current) { clearTimeout(resumeSafetyRef.current); resumeSafetyRef.current = null; }
    setAppResuming(false);
  }, [musicSyncEpoch]);

  const idleTier = useMusicIdleTier(homeAnimEpoch);
  const constantAnimsActive = homeAnimActive && !appResuming;
  const statsPulseActive = idleTier >= 1 && homeAnimActive && !appResuming;
  const titleFlyActive = idleTier >= 2 && homeAnimActive && !appResuming;
  // Phase anchor for the pulse/title animations: the CURRENT audio loop's
  // start (re-anchored every wrap, so drift vs the audio can't accumulate).
  // Tier *thresholds* stay on homeAnimEpoch above — otherwise the idle
  // escalation would reset to zero at every loop wrap.
  const animPhaseEpoch = musicLoopStartedAt || homeAnimEpoch;
  // Dividers join the escalation at tier 2 only: half-note comet sweeps,
  // top line then bottom line, alternating within each bar.
  const dividerMode: 'static' | 'comet' =
    homeAnimActive && !appResuming && idleTier >= 2 ? 'comet' : 'static';

  useEffect(() => {
    AsyncStorage.getItem('tm_seen_how_to_play').then(v => {
      if (!v) {
        setHowToIsFirstOpen(true);
        setHowToOpen(true);
        AsyncStorage.setItem('tm_seen_how_to_play', '1').catch(() => {});
      }
    }).catch(() => {});
  }, []);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  // Scale UI relative to a 390-pt baseline, capped at 1.4× for large screens (iPad / Android tablet).
  const scale = Math.min(width / 390, 1.4);
  const ph    = Math.round(20 * scale);   // paddingHorizontal
  const gap   = Math.round(10 * scale);   // standard gap between siblings
  const rowH  = Math.round((Platform.OS === 'android' ? 50 : 60) * scale);
  const r14   = Math.round(14 * scale);
  const r16   = Math.round(16 * scale);
  const r12   = Math.round(12 * scale);
  const f     = (n: number) => Math.round(n * scale);

  // Button widths: content = width - 2*ph, 3 slots with 2 gaps between them
  const diffBtnW  = (width - ph * 2 - gap * 2) / 3;
  const continueW = Math.round(diffBtnW * 2 + gap);
  const newGameW  = Math.round(diffBtnW);

  const dstats = statsFor(difficulty);

  const currentStreak = useMemo(() => {
    if (stats.recentRuns.length === 0) return 0;
    const DAY = 86400000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = new Set(stats.recentRuns.map(r => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    let cur = today.getTime();
    if (!days.has(cur)) {
      cur -= DAY;
      if (!days.has(cur)) return 0;
    }
    let streak = 0;
    while (days.has(cur)) { streak++; cur -= DAY; }
    return streak;
  }, [stats.recentRuns]);

  const lastRunScore = useMemo(() => {
    const run = stats.recentRuns.find(r => r.difficulty === difficulty);
    return run ? run.score : 0;
  }, [stats.recentRuns, difficulty]);

  useFocusEffect(useCallback(() => {
    loadSavedGame(difficulty).then(s => setHasSavedGame(!!s)).catch(() => {});
  }, [difficulty]));

  // Auto-fit for the split-letter title: scale the font down just enough to
  // fit the available width. 1 (no change) on every device where the title
  // already fits; only narrow screens shrink. Both measurements settle in
  // the first layout pass, so there's no visible reflow.
  const [titleScale, setTitleScale] = useState(1);
  const titleContainerWRef = useRef(0);
  const titleNaturalWRef = useRef(0);
  const updateTitleScale = useCallback(() => {
    const containerW = titleContainerWRef.current;
    const naturalW = titleNaturalWRef.current;
    if (containerW > 0 && naturalW > 0) {
      const s = Math.min(1, containerW / naturalW);
      setTitleScale(prev => (Math.abs(prev - s) > 0.01 ? s : prev));
    }
  }, []);
  const onTitleContainerLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    titleContainerWRef.current = e.nativeEvent.layout.width;
    updateTitleScale();
  }, [updateTitleScale]);
  const onTitleNaturalLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    titleNaturalWRef.current = e.nativeEvent.layout.width;
    updateTitleScale();
  }, [updateTitleScale]);

  const handleContinue = useCallback(() => {
    router.push('/game');
  }, []);

  const handleNewGame = useCallback(() => {
    if (hasSavedGame) {
      setNewGameConfirmOpen(true);
    } else {
      const isFirst = isFirstRunOfSession();
      markFirstRunUsed();
      if (!hasNoAds && !isFirst) {
        showInterstitial(() => router.push({ pathname: '/game', params: { fresh: '1' } }));
      } else {
        router.push({ pathname: '/game', params: { fresh: '1' } });
      }
    }
  }, [hasSavedGame, hasNoAds, showInterstitial]);

  const handleNewGameConfirmed = useCallback(() => {
    setNewGameConfirmOpen(false);
    markFirstRunUsed();
    router.push({ pathname: '/game', params: { fresh: '1' } });
  }, []);

  return (
    <View style={[styles.safe, { paddingTop: top, paddingHorizontal: ph }]}>

      {/* TOP — logo, difficulty, play */}
      <View style={[styles.topBlock, { paddingTop: f(16), gap: f(12) }]}>
        <View style={[styles.titleRow, { marginLeft: -f(8) }]}>
          <AppLogo size={f(62)} animated={constantAnimsActive} />
          <View style={[styles.titleTextBlock, { marginLeft: f(4) }]} onLayout={onTitleContainerLayout}>
            {/* Invisible measurer: same text at base sizes, rendered
                unconstrained (absolute) so its natural width tells us how
                much the visible row must shrink to fit. Replaces the
                adjustsFontSizeToFit the single-Text title used to have,
                which per-letter animated units can't express. */}
            <View style={styles.titleMeasurer} pointerEvents="none" onLayout={onTitleNaturalLayout}>
              <Text style={[styles.titleTopside, { fontSize: f(30) }]}>Topside:</Text>
              <Text style={[styles.titleDiceDrop, { fontSize: f(28) }]}> Dice Drop</Text>
            </View>
            <View style={[styles.titleFlyRow, { minHeight: f(34) * titleScale }]}>
              {TITLE_UNITS.map(unit => (
                <FlyingTitleUnit
                  key={unit.index}
                  index={unit.index}
                  totalSlots={TITLE_TOTAL_SLOTS}
                  epoch={animPhaseEpoch}
                  active={titleFlyActive}
                  style={
                    unit.kind === 'topside'
                      ? [styles.titleTopside, { color: colors.titleColor ?? colors.text, fontSize: f(30) * titleScale }]
                      : [styles.titleDiceDrop, { color: colors.accent, fontSize: f(28) * titleScale }]
                  }
                >
                  {unit.text}
                </FlyingTitleUnit>
              ))}
            </View>
            <Text style={[styles.subtitleText, { color: colors.textSecondary, fontSize: f(13), marginTop: Platform.OS === 'android' ? 1 : f(3) }]}>
              A drop and merge game.
            </Text>
          </View>
        </View>

        <View style={[styles.diffSection, { height: rowH }]}>
          <View style={[styles.diffRow, { gap }]}>
            {DIFFICULTIES.map(d => {
              const active = d.id === difficulty;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.diffBtn,
                    { flex: 1, borderRadius: r14 },
                    active
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setDifficulty(d.id)}
                >
                  <Text style={[
                    styles.diffLabel,
                    { fontSize: f(15), color: active ? colors.accentText : colors.textSecondary, fontWeight: active ? '700' : '400' },
                  ]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={hasSavedGame ? [styles.btnRow, { gap }] : styles.btnSingle}>
          {hasSavedGame ? (
            <>
              <TouchableOpacity
                style={[styles.playBtn, { width: continueW, height: rowH, borderRadius: r14, backgroundColor: colors.accent }]}
                onPress={handleContinue}
              >
                <SpinningLabel active={constantAnimsActive} style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold', fontSize: f(24) }]}>
                  Continue
                </SpinningLabel>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.diffBtn, { width: newGameW, height: rowH, borderRadius: r14, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleNewGame}
              >
                <Text style={[styles.diffLabel, { fontSize: f(15), color: colors.textSecondary, fontWeight: '400' }]}>New Game</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, { height: rowH, borderRadius: r14, backgroundColor: colors.accent }]}
              onPress={handleNewGame}
            >
              <SpinningLabel active={constantAnimsActive} style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold', fontSize: f(24) }]}>
                Play
              </SpinningLabel>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SPACER 1 — flexible, divider centered within */}
      <View style={[styles.spacer, { maxHeight: f(40) }]}>
        <AnimatedDivider
          mode={dividerMode}
          epoch={animPhaseEpoch}
          color={colors.border}
          accentColor={colors.accent}
          direction="ltr"
          phaseHalf={0}
        />
      </View>

      {/* MIDDLE — 2x2 stat grid */}
      <View style={[styles.statsGrid, { gap: f(12) }]}>
        <View style={[styles.statsRow, { gap: f(12) }]}>
          <PulsingCard beatIndex={0} epoch={animPhaseEpoch} active={statsPulseActive} style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="star-outline" size={f(22)} color={colors.accent} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestUnassisted > 0 ? dstats.bestUnassisted.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>BEST UNASSISTED</Text>
          </PulsingCard>
          <PulsingCard beatIndex={1} epoch={animPhaseEpoch} active={statsPulseActive} style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="trophy-outline" size={f(22)} color={colors.accent} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestScore > 0 ? dstats.bestScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>BEST OVERALL</Text>
          </PulsingCard>
        </View>
        <View style={[styles.statsRow, { gap: f(12) }]}>
          <PulsingCard beatIndex={2} epoch={animPhaseEpoch} active={statsPulseActive} style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="timer-outline" size={f(22)} color={colors.textSecondary} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {lastRunScore > 0 ? lastRunScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>LAST RUN</Text>
          </PulsingCard>
          <PulsingCard beatIndex={3} epoch={animPhaseEpoch} active={statsPulseActive} style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="flame-outline" size={f(22)} color={colors.textSecondary} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {currentStreak > 0 ? currentStreak.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>DAY STREAK</Text>
          </PulsingCard>
        </View>
      </View>

      {/* SPACER 2 — flexible, divider centered within */}
      <View style={[styles.spacer, { maxHeight: f(40) }]}>
        <AnimatedDivider
          mode={dividerMode}
          epoch={animPhaseEpoch}
          color={colors.border}
          accentColor={colors.accent}
          direction="rtl"
          phaseHalf={1}
        />
      </View>

      {/* BOTTOM — how to play + sound toggle + premium */}
      <View style={[styles.bottomBlock, { paddingBottom: f(20), gap: f(12) }]}>
        <View style={[styles.bottomRow, { gap }]}>
          <TouchableOpacity
            style={[styles.rowBtn, { flex: 1, height: rowH, borderRadius: r14, paddingHorizontal: f(16), gap: f(8), backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => { setHowToIsFirstOpen(false); setHowToOpen(true); }}
          >
            <Ionicons name="book-outline" size={f(18)} color={colors.accent} />
            <Text style={[styles.rowBtnText, { color: colors.textSecondary, fontSize: f(15) }]}>How to Play</Text>
          </TouchableOpacity>
          {devMusicIncluded ? (
            <View style={[styles.bottomRow, { flex: 1, gap: f(8) }]}>
              <CrossableIconButton
                icon="volume-high"
                enabled={soundEnabled}
                onPress={() => setSoundEnabled(!soundEnabled)}
                rowH={rowH} r14={r14} f={f} colors={colors}
              />
              <CrossableIconButton
                icon="musical-notes"
                enabled={musicEnabled}
                onPress={() => setMusicEnabled(!musicEnabled)}
                rowH={rowH} r14={r14} f={f} colors={colors}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.rowBtn, { flex: 1, height: rowH, borderRadius: r14, paddingHorizontal: f(16), gap: f(8), backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => setSoundEnabled(!soundEnabled)}
            >
              <Ionicons
                name={soundEnabled ? 'volume-high' : 'volume-mute'}
                size={f(20)}
                color={soundEnabled ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.rowBtnText, { color: colors.textSecondary, fontSize: f(15), width: f(76) }]}>
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!(hasCustomization && hasNoAds) && (
          <TouchableOpacity
            style={[styles.unlockBanner, { backgroundColor: colors.premiumGold, borderRadius: r12, paddingVertical: f(11), paddingHorizontal: f(16), gap: f(7) }]}
            onPress={() => setPremiumModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={f(14)} color={colors.accentText} />
            <Text
              style={[styles.unlockBannerText, { color: colors.accentText, fontSize: f(13), flexShrink: 1 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {hasCustomization ? 'Remove All Ads' : 'Unlock Sound Packs, Themes, and More'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <HowToPlayModal visible={howToOpen} showConsent={howToIsFirstOpen} onClose={() => setHowToOpen(false)} />
      <PremiumModal visible={premiumModalVisible} onClose={() => setPremiumModalVisible(false)} />

      {/* New Game confirmation */}
      <Modal visible={newGameConfirmOpen} transparent animationType="fade" onRequestClose={() => setNewGameConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
              Start New Game?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              This will discard your currently saved run.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              onPress={() => { setNewGameConfirmOpen(false); setTimeout(handleContinue, 200); }}
            >
              <Text style={[styles.modalBtnText, { color: colors.accentText }]}>Continue Saved Run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOutlineBtn, { borderColor: colors.accent }]}
              onPress={handleNewGameConfirmed}
            >
              <Text style={[styles.modalOutlineText, { color: colors.accent }]}>Start New Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOutlineBtn, { borderColor: colors.border }]}
              onPress={() => setNewGameConfirmOpen(false)}
            >
              <Text style={[styles.modalOutlineText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Icon-only toggle button with a diagonal strike overlay when off — used for
// the Sound/Music split (dev-only, pending a real music track).
function CrossableIconButton({ icon, enabled, onPress, rowH, r14, f, colors }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  onPress: () => void;
  rowH: number; r14: number; f: (n: number) => number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[crossBtnStyles.btn, { flex: 1, height: rowH, borderRadius: r14, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={crossBtnStyles.iconWrap}>
        <Ionicons name={icon} size={f(20)} color={enabled ? colors.accent : colors.textMuted} />
        {!enabled && (
          <View style={[crossBtnStyles.strike, { backgroundColor: colors.textMuted, width: f(26) }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const crossBtnStyles = StyleSheet.create({
  btn:      { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  strike:   { position: 'absolute', height: 2, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
});

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  topBlock:     {},
  spacer:       { flex: 1, justifyContent: 'center' },
  statsGrid:    { flex: 1 },
  statsRow:     { flex: 1, flexDirection: 'row' },
  bottomBlock:  {},

  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  titleTextBlock: { flex: 1 },
  titleText:      {},
  titleFlyRow:    { flexDirection: 'row', alignItems: 'baseline' },
  titleMeasurer:  { position: 'absolute', flexDirection: 'row', alignItems: 'baseline', opacity: 0 },
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold' },
  titleDiceDrop:  { fontFamily: 'Rubik_700Bold', letterSpacing: 0.5 },
  subtitleText:   { fontWeight: '600', letterSpacing: 0.3, marginLeft: 2 },

  heroLabel:      { fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  heroValue:      {},
  bestScoreCard:  { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  diffSection:  {},
  diffRow:      { flexDirection: 'row', height: '100%' },
  diffBtn:      { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  diffLabel:    {},

  btnRow:       { flexDirection: 'row' },
  btnSingle:    {},
  playBtn:      { alignItems: 'center', justifyContent: 'center' },
  playBtnText:  {},

  bottomRow:    { flexDirection: 'row' },
  rowBtn:       { borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rowBtnText:   { fontWeight: '500' },

  unlockBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  unlockBannerText: { fontWeight: '700' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalCard:        { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: IS_LARGE ? 16 : 12 },
  modalTitle:       { fontSize: IS_LARGE ? 32 : 28, marginBottom: 4 },
  modalSubtitle:    { fontSize: IS_LARGE ? 17 : 13, textAlign: 'center', lineHeight: IS_LARGE ? 24 : 18, marginBottom: 4 },
  modalBtn:         { width: '100%', paddingVertical: IS_LARGE ? 20 : 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText:     { fontSize: IS_LARGE ? 20 : 17, fontWeight: '700' },
  modalOutlineBtn:  { width: '100%', paddingVertical: IS_LARGE ? 18 : 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  modalOutlineText: { fontSize: IS_LARGE ? 19 : 16, fontWeight: '600' },
});
