import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type SearchResult   = { player_id: string; display_name: string; best_score: number; is_following: boolean };
type FollowingEntry = { player_id: string; display_name: string; best_score: number; run_count: number };

interface Props {
  visible:   boolean;
  playerId:  string | null;
  mode:      'search' | 'following';
  onClose:   () => void;
  onChanged: () => void;
}

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n > 0 ? n.toLocaleString() : '—';
}

export default function FindPlayerModal({ visible, playerId, mode, onClose, onChanged }: Props) {
  const { colors } = useTheme();
  const [query,           setQuery]           = useState('');
  const [searching,       setSearching]       = useState(false);
  const [searchResults,   setSearchResults]   = useState<SearchResult[]>([]);
  const [following,       setFollowing]       = useState<FollowingEntry[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFollowing = useCallback(async () => {
    if (!playerId) return;
    const { data } = await supabase.rpc('get_following', { p_player_id: playerId });
    setFollowing(data ?? []);
    setFollowingLoaded(true);
  }, [playerId]);

  useEffect(() => {
    if (visible && playerId) loadFollowing();
    if (!visible) {
      setQuery('');
      setSearchResults([]);
      setFollowingLoaded(false);
    }
  }, [visible, playerId, loadFollowing]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc('search_players', {
        p_query:       query.trim(),
        p_follower_id: playerId,
        p_limit:       20,
      });
      setSearchResults(data ?? []);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, playerId]);

  const handleFollow = useCallback(async (targetId: string) => {
    if (!playerId) return;
    setSearchResults(prev => prev.map(r =>
      r.player_id === targetId ? { ...r, is_following: true } : r
    ));
    await supabase.rpc('follow_player', { p_follower_id: playerId, p_following_id: targetId });
    await loadFollowing();
    onChanged();
  }, [playerId, loadFollowing, onChanged]);

  const handleUnfollow = useCallback(async (targetId: string) => {
    if (!playerId) return;
    setFollowing(prev => prev.filter(f => f.player_id !== targetId));
    setSearchResults(prev => prev.map(r =>
      r.player_id === targetId ? { ...r, is_following: false } : r
    ));
    await supabase.rpc('unfollow_player', { p_follower_id: playerId, p_following_id: targetId });
    onChanged();
  }, [playerId, onChanged]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            {mode === 'following' ? 'Following' : 'Find Players'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {mode === 'search' && (
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {mode === 'following' && followingLoaded && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    FOLLOWING ({following.length})
                  </Text>
                  {following.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textMuted }]}>
                      Not following anyone yet.
                    </Text>
                  ) : (
                    following.map(f => (
                      <View key={f.player_id} style={[styles.row, { borderBottomColor: colors.border }]}>
                        <View style={styles.rowInfo}>
                          <Text style={[styles.rowName, { color: colors.text }]}>{f.display_name}</Text>
                          <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                            Best {formatScore(f.best_score)} · {f.run_count} {f.run_count === 1 ? 'run' : 'runs'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.border }]}
                          onPress={() => handleUnfollow(f.player_id)}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Unfollow</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {mode === 'search' && query.trim().length > 0 && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RESULTS</Text>
                  {searching ? (
                    <ActivityIndicator style={{ padding: 16 }} color={colors.accent} />
                  ) : searchResults.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textMuted }]}>No players found.</Text>
                  ) : (
                    searchResults.map(r => (
                      <View key={r.player_id} style={[styles.row, { borderBottomColor: colors.border }]}>
                        <View style={styles.rowInfo}>
                          <Text style={[styles.rowName, { color: colors.text }]}>{r.display_name}</Text>
                          <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                            Best {formatScore(r.best_score)}
                          </Text>
                        </View>
                        {r.is_following ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: colors.border }]}
                            onPress={() => handleUnfollow(r.player_id)}
                          >
                            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Following</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                            onPress={() => handleFollow(r.player_id)}
                          >
                            <Text style={[styles.actionBtnText, { color: colors.accentText }]}>Follow</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title:          { fontSize: 20 },
  searchBar:      { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, fontSize: 15 },
  listContent:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
  section:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionTitle:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.0, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  rowInfo:        { flex: 1 },
  rowName:        { fontSize: 15, fontWeight: '600' },
  rowSub:         { fontSize: 12, marginTop: 1 },
  actionBtn:      { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText:  { fontSize: 13, fontWeight: '600' },
  empty:          { textAlign: 'center', padding: 16, fontSize: 14, fontStyle: 'italic' },
});
