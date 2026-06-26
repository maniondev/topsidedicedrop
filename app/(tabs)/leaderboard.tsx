import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Pressable, Platform, Dimensions } from 'react-native';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;
import Animated, { useSharedValue, withTiming, Easing, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { Difficulty } from '@/contexts/DifficultyContext';
import { RunRecord } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { getPlayerIdentity, regenerateName } from '@/lib/playerIdentity';
import FindPlayerModal from '@/components/FindPlayerModal';

type BestEntry     = { player_id: string; display_name: string; score: number; best_chain: number; difficulty: string; used_continue: boolean };
type LifetimeEntry = { player_id: string; display_name: string; lifetime_score: number; run_count: number };
type RankInfo      = { rank: number; percentile: number } | null;
type LbMode        = 'best' | 'lifetime';
type TimePeriod    = 'all' | 'day' | 'week' | 'month';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const DIFF_COLOR: Record<Difficulty, string> = { easy: '#27AE60', medium: '#F5A623', hard: '#E45757' };

function DiffBadge({ diff }: { diff: Difficulty }) {
  return (
    <Text style={[styles.badge, { color: DIFF_COLOR[diff], borderColor: DIFF_COLOR[diff] }]}>
      {diff.charAt(0).toUpperCase()}
    </Text>
  );
}

function RunRow({ rank, run }: { rank: number; run: RunRecord }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.runRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.runRank, { color: rank <= 3 ? colors.accent : colors.textMuted }]}>#{rank}</Text>
      <View style={styles.runInfo}>
        <Text style={[styles.runName, { color: colors.text }]} numberOfLines={1}>{formatDate(run.date)}</Text>
        <Text style={[styles.runDate, { color: colors.textMuted }]}>{run.difficulty}</Text>
      </View>
      <View style={styles.runRight}>
        <View style={styles.runTopRow}>
          <Text style={[styles.runScore, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>{formatScore(run.score)}</Text>
        </View>
        <Text style={[styles.unassistedLabel, { color: colors.accent, opacity: run.usedContinue ? 0 : 1 }]}>unassisted</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { stats } = useStats();
  const { top } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [activeTab,       setActiveTab]       = useState<'yours' | 'leaderboard'>('yours');

  // Sliding segment control
  const segPos      = useSharedValue(0); // 0 = yours, 1 = leaderboard
  const segWidthSV  = useSharedValue(0); // measured container width

  const SEG_TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };

  useEffect(() => {
    const target = activeTab === 'leaderboard' ? 1 : 0;
    if (Math.abs(segPos.value - target) < 0.01) return;
    segPos.value = withTiming(target, SEG_TIMING);
  }, [activeTab]);

  const pillStyle = useAnimatedStyle(() => {
    const pw = (segWidthSV.value - 11) / 2;
    return { width: pw, transform: [{ translateX: segPos.value * (pw + 3) }] };
  });

  const leftTextStyle  = useAnimatedStyle(() => ({
    color: interpolateColor(segPos.value, [0, 1], [colors.accentText, colors.textSecondary]),
  }));
  const rightTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(segPos.value, [0, 1], [colors.textSecondary, colors.accentText]),
  }));

  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [filterType,      setFilterType]      = useState<'overall' | 'unassisted'>('overall');
  const [filterTime,      setFilterTime]      = useState<TimePeriod>('all');
  const [lbMode,          setLbMode]          = useState<LbMode>('best');
  const [lbScope,         setLbScope]         = useState<'global' | 'following'>('global');
  const [sortBy,          setSortBy]          = useState<'score' | 'recent'>('score');
  const [findPlayerVisible,   setFindPlayerVisible]   = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);

  // Identity
  const [playerId,     setPlayerId]     = useState<string | null>(null);
  const [displayName,  setDisplayName]  = useState<string | null>(null);
  const [renaming,     setRenaming]     = useState(false);

  // Leaderboard data
  const [bestEntries,     setBestEntries]     = useState<BestEntry[]>([]);
  const [lifetimeEntries, setLifetimeEntries] = useState<LifetimeEntry[]>([]);
  const [bestRankInfo,    setBestRankInfo]    = useState<RankInfo>(null);
  const [lifetimeRankInfo,setLifetimeRankInfo]= useState<RankInfo>(null);
  const [lbLoading,       setLbLoading]       = useState(false);
  const [lbError,         setLbError]         = useState<string | null>(null);
  const [dbBestScore,     setDbBestScore]     = useState<number>(0);
  const [dbLifetimeScore, setDbLifetimeScore] = useState<number>(0);

  // Local stat derivations
  const isUnassisted = filterType === 'unassisted';
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];

  const filteredRuns = stats.recentRuns.filter(r => {
    const diffMatch = filterDifficulty === 'all' || r.difficulty === filterDifficulty;
    // In unassisted mode: include unassisted runs AND continued runs that have a pre-continue score
    const typeMatch = !isUnassisted || !r.usedContinue || (r.usedContinue && !!r.preContinueScore);
    return diffMatch && typeMatch;
  }).map(r => (isUnassisted && r.usedContinue && r.preContinueScore)
    ? { ...r, score: r.preContinueScore, usedContinue: false }
    : r
  );
  const overallRuns = stats.recentRuns.filter(r => filterDifficulty === 'all' || r.difficulty === filterDifficulty);

  const weekAgo  = Date.now() - 7  * 24 * 60 * 60 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const timeFilter = (r: RunRecord) =>
    filterTime === 'all'   ? true :
    filterTime === 'week'  ? r.date >= weekAgo :
                             r.date >= monthAgo;

  const bestRun = filterDifficulty === 'all'
    ? Math.max(0, ...diffs.map(d => isUnassisted ? stats.byDifficulty[d].bestUnassisted : stats.byDifficulty[d].bestScore))
    : isUnassisted ? stats.byDifficulty[filterDifficulty].bestUnassisted : stats.byDifficulty[filterDifficulty].bestScore;

  const lifetimeScore = isUnassisted
    ? filteredRuns.reduce((sum, r) => sum + r.score, 0)
    : filterDifficulty === 'all'
      ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].lifetimeScore, 0)
      : stats.byDifficulty[filterDifficulty].lifetimeScore;

  const bestThisWeek  = Math.max(0, ...filteredRuns.filter(r => r.date >= weekAgo).map(r => r.score));
  const bestThisMonth = Math.max(0, ...filteredRuns.filter(r => r.date >= monthAgo).map(r => r.score));
  const averageScore = filteredRuns.length > 0
    ? Math.round(filteredRuns.reduce((a, r) => a + r.score, 0) / filteredRuns.length) : 0;
  const totalRuns = filterDifficulty === 'all'
    ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].totalRuns, 0)
    : stats.byDifficulty[filterDifficulty].totalRuns;

  const rankedRuns = [...filteredRuns.filter(timeFilter)].sort((a, b) =>
    sortBy === 'score' ? b.score - a.score : b.date - a.date
  );

  // Load identity on mount
  useEffect(() => {
    getPlayerIdentity().then(({ playerId: id, displayName: name }) => {
      setPlayerId(id);
      setDisplayName(name);
    }).catch(() => {});
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    setLbError(null);
    setDbBestScore(0);
    setDbLifetimeScore(0);
    try {
      const diff          = filterDifficulty === 'all' ? null : filterDifficulty;
      const unassisted    = filterType === 'unassisted';
      const followerParam = lbScope === 'following' ? playerId : null;

      const fetchTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      );
      const [bestRes, lifetimeRes] = await Promise.race([
        Promise.all([
          supabase.rpc('get_leaderboard_best', {
            p_difficulty: diff, p_unassisted: unassisted, p_time_period: filterTime,
            p_limit: 100, p_follower_id: followerParam,
          }),
          supabase.rpc('get_leaderboard_lifetime', {
            p_difficulty: diff, p_time_period: filterTime,
            p_limit: 100, p_follower_id: followerParam, p_unassisted: unassisted,
          }),
        ]),
        fetchTimeout,
      ]);

      if (bestRes.error)     throw bestRes.error;
      if (lifetimeRes.error) throw lifetimeRes.error;
      setBestEntries(bestRes.data     ?? []);
      setLifetimeEntries(lifetimeRes.data ?? []);

      if (playerId) {
        // Use the player's actual DB score rather than local stats so rank/percentile
        // reflects what's genuinely on the leaderboard, not unsubmitted local bests.
        const myBest     = (bestRes.data     as BestEntry[]    )?.find(e => e.player_id === playerId);
        const myLifetime = (lifetimeRes.data as LifetimeEntry[])?.find(e => e.player_id === playerId);
        let scoreForRank    = myBest?.score           ?? 0;
        let lifetimeForRank = myLifetime?.lifetime_score ?? 0;

        // If not in the top-100 list, query the leaderboard table directly so rank
        // and percentile show correctly for players outside the top 100.
        if (scoreForRank === 0 || lifetimeForRank === 0) {
          try {
            const diff = filterDifficulty === 'all' ? null : filterDifficulty;
            let playerQuery = supabase
              .from('leaderboard')
              .select('difficulty, best_score, best_unassisted, lifetime_score')
              .eq('player_id', playerId);
            if (diff) playerQuery = (playerQuery as any).eq('difficulty', diff);
            const { data: playerRows } = await playerQuery;
            if (playerRows && playerRows.length > 0) {
              if (scoreForRank === 0) {
                scoreForRank = Math.max(0, ...playerRows.map((r: any) =>
                  unassisted ? r.best_unassisted : r.best_score
                ));
              }
              if (lifetimeForRank === 0) {
                lifetimeForRank = playerRows.reduce((sum: number, r: any) => sum + r.lifetime_score, 0);
              }
            }
          } catch {}
        }

        setDbBestScore(scoreForRank);
        setDbLifetimeScore(lifetimeForRank);

        const [bestRankRes, lifetimeRankRes] = await Promise.all([
          supabase.rpc('get_best_rank_and_percentile', {
            p_score: scoreForRank, p_difficulty: diff, p_unassisted: unassisted,
            p_time_period: filterTime, p_follower_id: followerParam,
          }),
          supabase.rpc('get_lifetime_rank_and_percentile', {
            p_lifetime: lifetimeForRank, p_difficulty: diff,
            p_time_period: filterTime, p_follower_id: followerParam, p_unassisted: unassisted,
          }),
        ]);
        const bestRankData     = Array.isArray(bestRankRes.data)     ? bestRankRes.data[0]     : bestRankRes.data;
        const lifetimeRankData = Array.isArray(lifetimeRankRes.data) ? lifetimeRankRes.data[0] : lifetimeRankRes.data;
        setBestRankInfo(scoreForRank > 0    ? (bestRankData     ?? null) : null);
        setLifetimeRankInfo(lifetimeForRank > 0 ? (lifetimeRankData ?? null) : null);
      }
    } catch {
      setLbError('Could not load leaderboard.');
    } finally {
      setLbLoading(false);
    }
  }, [filterDifficulty, filterType, filterTime, playerId, lbScope]);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (activeTab === 'leaderboard') fetchLeaderboard();
  }, [activeTab, fetchLeaderboard]));

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard();
  }, [filterDifficulty, filterType, filterTime, lbScope, activeTab]);

  const handleRegenerate = useCallback(async () => {
    setRenaming(true);
    try {
      const newName = await regenerateName();
      setDisplayName(newName);
      if (playerId) {
        setBestEntries(prev => prev.map(e => e.player_id === playerId ? { ...e, display_name: newName } : e));
        setLifetimeEntries(prev => prev.map(e => e.player_id === playerId ? { ...e, display_name: newName } : e));
      }
      fetchLeaderboard();
    } catch {} finally {
      setRenaming(false);
    }
  }, [fetchLeaderboard, playerId]);

  function FilterDropdown({ label, value, options, onChange, disabled }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: any) => void;
    disabled?: boolean;
  }) {
    const [open, setOpen] = useState(false);
    const current = options.find(o => o.value === value);
    return (
      <>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: disabled ? 0.38 : 1 }]}
          onPress={() => !disabled && setOpen(true)}
          activeOpacity={disabled ? 1 : 0.7}
        >
          <Text style={[styles.dropdownLabel, { color: colors.accentText, opacity: 0.7 }]}>{label}</Text>
          <View style={styles.dropdownValue}>
            <Text style={[styles.dropdownValueText, { color: colors.accentText }]} numberOfLines={1}>
              {current?.label ?? value}
            </Text>
            <Ionicons name="chevron-down" size={13} color={colors.accentText} />
          </View>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.dropdownMenuTitle, { color: colors.textMuted }]}>{label}</Text>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dropdownMenuItem, { borderBottomColor: colors.border }]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text style={[styles.dropdownMenuItemText, {
                    color: opt.value === value ? colors.accent : colors.text,
                    fontWeight: opt.value === value ? '700' : '400',
                  }]}>{opt.label}</Text>
                  {opt.value === value && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  const StatCard = ({ mode, label, score, rankInfo, selected, onSelect }: {
    mode: LbMode; label: string; score: number; rankInfo: RankInfo; selected: boolean; onSelect: () => void;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: selected ? colors.accent : colors.cardBorder, borderWidth: 2 }]}>
      <View style={styles.statCardHeader}>
        <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.accent : colors.border }]}
          onPress={onSelect}
        >
          <Text style={[styles.selectBtnText, { color: selected ? colors.accentText : colors.textSecondary }]}>
            {selected ? 'Selected' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>SCORE</Text>
          <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
            {score > 0 ? formatScore(score) : '—'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>RANK</Text>
          <Text style={[styles.statValue, { color: rankInfo ? (colors.statNumColor ?? colors.text) : colors.textDim, fontFamily: 'Rubik_700Bold' }]}>
            {rankInfo ? `#${rankInfo.rank}` : '—'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>BETTER THAN</Text>
          <Text style={[styles.statValue, { color: rankInfo ? (colors.statNumColor ?? colors.text) : colors.textDim, fontFamily: 'Rubik_700Bold' }]}>
            {rankInfo ? `${Math.round(rankInfo.percentile)}%` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.titleColor ?? colors.text }]}>{activeTab === 'yours' ? 'Your Stats' : 'Leaderboard'}</Text>
      </View>

      {/* Username card */}
      <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginHorizontal: 16, marginBottom: 12 }]}>
        <Ionicons name="person-circle-outline" size={18} color={colors.accent} />
        <Text style={[styles.nameText, { color: colors.text }]} numberOfLines={1}>
          {displayName ?? '…'}
        </Text>
        <TouchableOpacity onPress={handleRegenerate} disabled={renaming} style={styles.regenBtn}>
          {renaming
            ? <ActivityIndicator size="small" color={colors.textMuted} />
            : <Text style={[styles.regenText, { color: colors.textMuted }]} numberOfLines={1}>new name</Text>}
        </TouchableOpacity>
      </View>

      {/* Segment tabs — sliding pill */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View
            style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onLayout={(e) => { segWidthSV.value = e.nativeEvent.layout.width; }}
          >
            {/* Sliding pill behind the labels */}
            <Animated.View style={[styles.segPill, { backgroundColor: colors.accent }, pillStyle]} />
            <TouchableOpacity style={styles.segBtn} onPress={() => { setActiveTab('yours'); setFilterTime('all'); }} activeOpacity={0.8}>
              <Animated.Text style={[styles.segBtnText, leftTextStyle]}>Your Stats</Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.segBtn} onPress={() => setActiveTab('leaderboard')} activeOpacity={0.8}>
              <Animated.Text style={[styles.segBtnText, rightTextStyle]}>Leaderboard</Animated.Text>
            </TouchableOpacity>
          </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Filters */}
        <View style={styles.filterGrid}>
          <FilterDropdown
            label="Difficulty"
            value={filterDifficulty}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Easy', value: 'easy' },
              { label: 'Medium', value: 'medium' },
              { label: 'Hard', value: 'hard' },
            ]}
            onChange={setFilterDifficulty}
          />
          <FilterDropdown
            label="Type"
            value={filterType}
            options={[
              { label: 'Overall', value: 'overall' },
              { label: 'Unassisted', value: 'unassisted' },
            ]}
            onChange={setFilterType}
          />
          {activeTab === 'leaderboard' && (
            <>
              <FilterDropdown
                label="Period"
                value={filterTime}
                options={[
                  { label: 'All Time', value: 'all' },
                  { label: 'This Month', value: 'month' },
                  { label: 'This Week', value: 'week' },
                  { label: 'Today', value: 'day' },
                ]}
                onChange={setFilterTime}
              />
              <FilterDropdown
                label="Scope"
                value={lbScope}
                options={[
                  { label: 'Global', value: 'global' },
                  { label: 'Following', value: 'following' },
                ]}
                onChange={setLbScope}
              />
            </>
          )}
        </View>

        {activeTab === 'yours' ? (
          <>
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST RUN</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {bestRun > 0 ? bestRun.toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {bestThisWeek > 0 ? bestThisWeek.toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>THIS MONTH</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {bestThisMonth > 0 ? bestThisMonth.toLocaleString() : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL RUNS</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {totalRuns > 0 ? totalRuns : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {lifetimeScore > 0 ? formatScore(lifetimeScore) : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVERAGE</Text>
                  <Text style={[styles.statValue, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {averageScore > 0 ? averageScore.toLocaleString() : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR LAST 100 RUNS</Text>
                <View style={styles.sortToggle}>
                  <TouchableOpacity onPress={() => setSortBy('score')}>
                    <Text style={[styles.sortBtn, { color: sortBy === 'score' ? colors.accent : colors.textMuted, fontWeight: sortBy === 'score' ? '700' : '400' }]}>Score</Text>
                  </TouchableOpacity>
                  <Text style={[styles.sortSep, { color: colors.border }]}>|</Text>
                  <TouchableOpacity onPress={() => setSortBy('recent')}>
                    <Text style={[styles.sortBtn, { color: sortBy === 'recent' ? colors.accent : colors.textMuted, fontWeight: sortBy === 'recent' ? '700' : '400' }]}>Recent</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {rankedRuns.length > 0
                ? rankedRuns.map((run, i) => <RunRow key={`${run.date}-${run.score}`} rank={i + 1} run={run} />)
                : <Text style={[styles.empty, { color: colors.textMuted }]}>No runs yet.</Text>}
            </View>
          </>
        ) : (
          <>
            {/* Stat cards */}
            <StatCard
              mode="best"    label="BEST SCORE"    score={dbBestScore}     rankInfo={bestRankInfo}
              selected={lbMode === 'best'}    onSelect={() => setLbMode('best')}
            />
            <StatCard
              mode="lifetime" label="LIFETIME SCORE" score={dbLifetimeScore} rankInfo={lifetimeRankInfo}
              selected={lbMode === 'lifetime'} onSelect={() => setLbMode('lifetime')}
            />

            {lbScope === 'following' && (
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setFollowingModalVisible(true)}
                >
                  <Text style={[styles.filterBtnText, { color: colors.accentText }]}>View Following</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  onPress={() => setFindPlayerVisible(true)}
                >
                  <Text style={[styles.filterBtnText, { color: colors.accentText }]}>Find Players</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Leaderboard list */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  TOP 100 · {lbMode === 'best' ? 'BEST SCORE' : 'LIFETIME'}
                </Text>
                <TouchableOpacity onPress={fetchLeaderboard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="refresh" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {lbLoading ? (
                <ActivityIndicator style={{ padding: 24 }} color={colors.accent} />
              ) : lbError ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>{lbError}</Text>
              ) : lbMode === 'best' ? (
                bestEntries.length === 0
                  ? <Text style={[styles.empty, { color: colors.textMuted }]}>{lbScope === 'following' ? 'No scores in your network yet.' : 'No scores yet — be the first!'}</Text>
                  : bestEntries.map((entry, i) => {
                      const isYou = entry.player_id === playerId;
                      return (
                        <View key={i} style={[styles.runRow, { borderBottomColor: colors.border, backgroundColor: isYou ? colors.accentDim : 'transparent' }]}>
                          <Text style={[styles.runRank, { color: i < 3 ? colors.accent : colors.textMuted }]}>#{i + 1}</Text>
                          <View style={styles.runInfo}>
                            <Text style={[styles.runName, { color: isYou ? colors.accent : colors.text }]} numberOfLines={1}>
                              {entry.display_name}{isYou ? ' (you)' : ''}
                            </Text>
                            <Text style={[styles.runDate, { color: colors.textMuted }]}>{entry.difficulty}</Text>
                          </View>
                          <View style={styles.runRight}>
                            <View style={styles.runTopRow}>
                              <Text style={[styles.runScore, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>{formatScore(entry.score)}</Text>
                            </View>
                            <Text style={[styles.unassistedLabel, { color: colors.accent, opacity: entry.used_continue ? 0 : 1 }]}>unassisted</Text>
                          </View>
                        </View>
                      );
                    })
              ) : (
                lifetimeEntries.length === 0
                  ? <Text style={[styles.empty, { color: colors.textMuted }]}>{lbScope === 'following' ? 'No scores in your network yet.' : 'No scores yet — be the first!'}</Text>
                  : lifetimeEntries.map((entry, i) => {
                      const isYou = entry.player_id === playerId;
                      return (
                        <View key={i} style={[styles.runRow, { borderBottomColor: colors.border, backgroundColor: isYou ? colors.accentDim : 'transparent' }]}>
                          <Text style={[styles.runRank, { color: i < 3 ? colors.accent : colors.textMuted }]}>#{i + 1}</Text>
                          <View style={styles.runInfo}>
                            <Text style={[styles.runName, { color: isYou ? colors.accent : colors.text }]} numberOfLines={1}>
                              {entry.display_name}{isYou ? ' (you)' : ''}
                            </Text>
                            <Text style={[styles.runDate, { color: colors.textMuted }]}>{entry.run_count} runs</Text>
                          </View>
                          <Text style={[styles.runScore, { color: colors.statNumColor ?? colors.text, fontFamily: 'Rubik_700Bold' }]}>
                            {formatScore(entry.lifetime_score)}
                          </Text>
                        </View>
                      );
                    })
              )}
            </View>
          </>
        )}
      </ScrollView>

      <FindPlayerModal
        visible={findPlayerVisible}
        playerId={playerId}
        mode="search"
        onClose={() => setFindPlayerVisible(false)}
        onChanged={() => { if (activeTab === 'leaderboard') fetchLeaderboard(); }}
      />
      <FindPlayerModal
        visible={followingModalVisible}
        playerId={playerId}
        mode="following"
        onClose={() => setFollowingModalVisible(false)}
        onChanged={() => { if (activeTab === 'leaderboard') fetchLeaderboard(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { paddingVertical: 16, paddingHorizontal: 20 },
  title:          { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  content:        { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  segment:        { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  segPill:        { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9 },
  segBtn:         { flex: 1, paddingVertical: IS_LARGE ? 13 : 9, borderRadius: 9, alignItems: 'center', zIndex: 1 },
  segBtnText:     { fontSize: IS_LARGE ? 17 : 14 },

  filterGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dropdown:            { width: '48.5%', borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: IS_LARGE ? 13 : 9 },
  dropdownLabel:       { fontSize: IS_LARGE ? 12 : 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 },
  dropdownValue:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValueText:   { fontSize: IS_LARGE ? 17 : 14, fontWeight: '600' },
  dropdownOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  dropdownMenu:        { width: '100%', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  dropdownMenuTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  dropdownMenuItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  dropdownMenuItemText:{ fontSize: 16 },

  nameCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: IS_LARGE ? 56 : 44 },
  nameText:       { flex: 1, fontSize: IS_LARGE ? 18 : 15, fontWeight: '600' },
  regenBtn:       { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  regenText:      { fontSize: 12 },

  statCard:       { borderRadius: 16, overflow: 'hidden' },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 },
  statCardLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.0 },
  selectBtn:      { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4 },
  selectBtnText:  { fontSize: 12, fontWeight: '600' },

  section:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.0 },
  sortToggle:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortBtn:        { fontSize: 13 },
  sortSep:        { fontSize: 13 },

  statsRow:       { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10 },
  statItem:       { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:    { width: 1, marginVertical: 4 },
  statLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1.0 },
  statValue:      { fontSize: 18 },

  runRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  runRank:         { fontSize: 14, fontWeight: '700', width: 32, textAlign: 'center' },
  runInfo:         { flex: 1 },
  runName:         { fontSize: 15, fontWeight: '600' },
  runDate:         { fontSize: 12, marginTop: 1 },
  runRight:        { alignItems: 'flex-end', gap: 2 },
  runTopRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runChain:        { fontSize: 12 },
  runScore:        { fontSize: 17 },
  unassistedLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  badge:           { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  filterRow:       { flexDirection: 'row', gap: 8 },
  filterBtn:       { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  filterBtnText:   { fontSize: 14, fontWeight: '600' },
  empty:           { textAlign: 'center', padding: 24, fontSize: 14, fontStyle: 'italic' },
});
