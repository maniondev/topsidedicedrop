import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
type TimePeriod    = 'all' | 'week' | 'month';

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
        <Text style={[styles.runName, { color: colors.text }]} numberOfLines={1}>You</Text>
        <Text style={[styles.runDate, { color: colors.textMuted }]}>{formatDate(run.date)}</Text>
      </View>
      <View style={styles.runRight}>
        <View style={styles.runTopRow}>
          {run.bestChain > 1 && <Text style={[styles.runChain, { color: colors.textMuted }]}>×{run.bestChain}</Text>}
          <DiffBadge diff={run.difficulty} />
          <Text style={[styles.runScore, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>{formatScore(run.score)}</Text>
        </View>
        {!run.usedContinue && <Text style={[styles.unassistedLabel, { color: colors.accent }]}>unassisted</Text>}
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

  // Local stat derivations
  const isUnassisted = filterType === 'unassisted';
  const typeForLifetime = 'overall'; // run type doesn't apply to lifetime
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];

  const filteredRuns = stats.recentRuns.filter(r => {
    const diffMatch = filterDifficulty === 'all' || r.difficulty === filterDifficulty;
    const typeMatch = !isUnassisted || !r.usedContinue;
    return diffMatch && typeMatch;
  });
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

  const lifetimeScore = filterDifficulty === 'all'
    ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].lifetimeScore, 0)
    : stats.byDifficulty[filterDifficulty].lifetimeScore;

  const bestThisWeek = Math.max(0, ...filteredRuns.filter(r => r.date >= weekAgo).map(r => r.score));
  const averageScore = overallRuns.length > 0
    ? Math.round(overallRuns.reduce((a, r) => a + r.score, 0) / overallRuns.length) : 0;
  const totalRuns = filterDifficulty === 'all'
    ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].totalRuns, 0)
    : stats.byDifficulty[filterDifficulty].totalRuns;
  const bestChain = filterDifficulty === 'all'
    ? Math.max(0, ...diffs.map(d => stats.byDifficulty[d].bestChain))
    : stats.byDifficulty[filterDifficulty].bestChain;

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
    try {
      const diff          = filterDifficulty === 'all' ? null : filterDifficulty;
      const unassisted    = filterType === 'unassisted';
      const followerParam = lbScope === 'following' ? playerId : null;

      const [bestRes, lifetimeRes] = await Promise.all([
        supabase.rpc('get_leaderboard_best', {
          p_difficulty: diff, p_unassisted: unassisted, p_time_period: filterTime,
          p_limit: 100, p_follower_id: followerParam,
        }),
        supabase.rpc('get_leaderboard_lifetime', {
          p_difficulty: diff, p_time_period: filterTime,
          p_limit: 100, p_follower_id: followerParam,
        }),
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
        const scoreForRank    = myBest?.score           ?? 0;
        const lifetimeForRank = myLifetime?.lifetime_score ?? 0;

        const [bestRankRes, lifetimeRankRes] = await Promise.all([
          supabase.rpc('get_best_rank_and_percentile', {
            p_score: scoreForRank, p_difficulty: diff, p_unassisted: unassisted,
            p_time_period: filterTime, p_follower_id: followerParam,
          }),
          supabase.rpc('get_lifetime_rank_and_percentile', {
            p_lifetime: lifetimeForRank, p_difficulty: diff,
            p_time_period: filterTime, p_follower_id: followerParam,
          }),
        ]);
        setBestRankInfo(scoreForRank > 0    ? (bestRankRes.data     ?? null) : null);
        setLifetimeRankInfo(lifetimeForRank > 0 ? (lifetimeRankRes.data ?? null) : null);
      }
    } catch {
      setLbError('Could not load leaderboard.');
    } finally {
      setLbLoading(false);
    }
  }, [filterDifficulty, filterType, filterTime, playerId, bestRun, lifetimeScore, lbScope]);

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
      if (activeTab === 'leaderboard') fetchLeaderboard();
    } catch {} finally {
      setRenaming(false);
    }
  }, [activeTab, fetchLeaderboard]);

  // When lifetime mode is active, force run type to overall
  const effectiveFilterType = lbMode === 'lifetime' ? 'overall' : filterType;

  const FilterBtn = ({ label, value, current, onPress, disabled }: {
    label: string; value: string; current: string; onPress: (v: any) => void; disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterBtn,
        { backgroundColor: current === value ? colors.accent : colors.card,
          borderColor: current === value ? colors.accent : colors.border,
          opacity: disabled ? 0.38 : 1 },
      ]}
      onPress={() => !disabled && onPress(value)}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[styles.filterBtnText, {
        color: current === value ? colors.accentText : colors.textSecondary,
        fontWeight: current === value ? '700' : '400',
      }]}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ mode, label, score, rankInfo, selected, onSelect }: {
    mode: LbMode; label: string; score: number; rankInfo: RankInfo; selected: boolean; onSelect: () => void;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: selected ? colors.accent : colors.cardBorder, borderWidth: selected ? 2 : 1 }]}>
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
          <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            {score > 0 ? formatScore(score) : '—'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>RANK</Text>
          <Text style={[styles.statValue, { color: rankInfo ? colors.accent : colors.textDim, fontFamily: 'Rubik_700Bold' }]}>
            {rankInfo ? `#${rankInfo.rank}` : '—'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>BETTER THAN</Text>
          <Text style={[styles.statValue, { color: rankInfo ? colors.accent : colors.textDim, fontFamily: 'Rubik_700Bold' }]}>
            {rankInfo ? `${rankInfo.percentile}%` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{activeTab === 'yours' ? 'Your Stats' : 'Leaderboard'}</Text>
      </View>

      {/* Segment tabs */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.segBtn, activeTab === 'yours' && { backgroundColor: colors.accent }]}
            onPress={() => setActiveTab('yours')}
          >
            <Text style={[styles.segBtnText, { color: activeTab === 'yours' ? colors.accentText : colors.textSecondary, fontWeight: activeTab === 'yours' ? '700' : '400' }]}>
              Your Stats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, activeTab === 'leaderboard' && { backgroundColor: colors.accent }]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.segBtnText, { color: activeTab === 'leaderboard' ? colors.accentText : colors.textSecondary, fontWeight: activeTab === 'leaderboard' ? '700' : '400' }]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Shared filters */}
        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <FilterBtn label="All"    value="all"    current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Easy"   value="easy"   current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Medium" value="medium" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Hard"   value="hard"   current={filterDifficulty} onPress={setFilterDifficulty} />
          </View>
          <View style={styles.filterRow}>
            <FilterBtn
              label="Overall"    value="overall"    current={effectiveFilterType}
              onPress={setFilterType}
              disabled={activeTab === 'leaderboard' && lbMode === 'lifetime'}
            />
            <FilterBtn
              label="Unassisted" value="unassisted" current={effectiveFilterType}
              onPress={setFilterType}
              disabled={activeTab === 'leaderboard' && lbMode === 'lifetime'}
            />
          </View>
        </View>

        {activeTab === 'yours' ? (
          <>
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST RUN</Text>
                  <Text style={[styles.statValue, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]}>
                    {bestRun > 0 ? bestRun.toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {bestThisWeek > 0 ? bestThisWeek.toLocaleString() : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST CHAIN</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {bestChain > 0 ? `×${bestChain}` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL RUNS</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {totalRuns > 0 ? totalRuns : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
                    {lifetimeScore > 0 ? formatScore(lifetimeScore) : '—'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVERAGE</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
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
            {/* Time period filter */}
            <View style={styles.filterRow}>
              <FilterBtn label="All Time"   value="all"   current={filterTime} onPress={setFilterTime} />
              <FilterBtn label="This Month" value="month" current={filterTime} onPress={setFilterTime} />
              <FilterBtn label="This Week"  value="week"  current={filterTime} onPress={setFilterTime} />
            </View>

            {/* Global / Following scope */}
            <View style={styles.filterRow}>
              <FilterBtn label="Global"    value="global"    current={lbScope} onPress={setLbScope} />
              <FilterBtn label="Following" value="following" current={lbScope} onPress={setLbScope} />
            </View>

            {/* Username card */}
            <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
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

            {/* Stat cards */}
            <StatCard
              mode="best"    label="BEST SCORE"    score={bestRun}      rankInfo={bestRankInfo}
              selected={lbMode === 'best'}    onSelect={() => setLbMode('best')}
            />
            <StatCard
              mode="lifetime" label="LIFETIME SCORE" score={lifetimeScore} rankInfo={lifetimeRankInfo}
              selected={lbMode === 'lifetime'} onSelect={() => setLbMode('lifetime')}
            />

            {lbScope === 'following' && (
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => setFollowingModalVisible(true)}
                >
                  <Text style={[styles.filterBtnText, { color: colors.textSecondary }]}>View Following</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => setFindPlayerVisible(true)}
                >
                  <Text style={[styles.filterBtnText, { color: colors.accent }]}>Find Players</Text>
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
                              {entry.best_chain > 1 && <Text style={[styles.runChain, { color: colors.textMuted }]}>×{entry.best_chain}</Text>}
                              <Text style={[styles.runScore, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>{formatScore(entry.score)}</Text>
                            </View>
                            {!entry.used_continue && <Text style={[styles.unassistedLabel, { color: colors.accent }]}>unassisted</Text>}
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
                          <Text style={[styles.runScore, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
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
  segBtn:         { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segBtnText:     { fontSize: 14 },

  filters:        { gap: 8 },
  filterRow:      { flexDirection: 'row', gap: 8 },
  filterBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  filterBtnText:  { fontSize: 13 },

  nameCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44 },
  nameText:       { flex: 1, fontSize: 15, fontWeight: '600' },
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
  empty:           { textAlign: 'center', padding: 24, fontSize: 14, fontStyle: 'italic' },
});
