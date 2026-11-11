import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Medal, Trophy } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type Player = {
  player_id: string;
  player_tag: string | null;
  display_name: string | null;
  battles_played: number;
  wins: number;
  total_score: number;
  leaderboard_rank: number;
};

const C = {
  bg: '#090B16',
  surface: '#111629',
  border: '#252D47',
  purple: '#9270FF',
  cyan: '#43D9E8',
  white: '#F7F7FC',
  muted: '#929BB5',
};

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async () => {
    setError('');

    const { data, error: requestError } = await supabase.rpc(
      'get_player_leaderboard',
      { p_limit: 100 }
    );

    if (requestError) {
      console.error('Leaderboard loading failed:', requestError.message);
      setError('Could not load rankings. Please try again.');
    } else {
      setPlayers((data || []) as Player[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const refresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={C.purple}
        />
      }
    >
      <Text style={styles.heading}>LEADERBOARD</Text>
      <Text style={styles.subtitle}>
        Compete, climb the ranks and become a champion.
      </Text>

      <LinearGradient
        colors={['#30245A', '#17182F', '#111629']}
        style={styles.hero}
      >
        <Trophy color={C.purple} size={35} />
        <Text style={styles.heroTitle}>THE TOP PLAYERS</Text>
        <Text style={styles.heroSubtitle}>
          Rankings update as completed battles are recorded.
        </Text>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>GLOBAL RANKINGS</Text>
        <Text style={styles.playerCount}>{players.length} PLAYERS</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={C.purple}
          style={{ marginTop: 45 }}
        />
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>RANKINGS UNAVAILABLE</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : players.length === 0 ? (
        <View style={styles.emptyCard}>
          <Trophy color={C.purple} size={35} />
          <Text style={styles.emptyTitle}>NO RANKINGS YET</Text>
          <Text style={styles.emptyText}>
            Complete your first battle to appear on the leaderboard.
          </Text>
        </View>
      ) : (
        players.map((player, index) => (
          <View key={player.player_id} style={styles.playerCard}>
            <View style={styles.rank}>
              {index === 0 ? (
                <Crown color="#FFD166" size={23} />
              ) : index === 1 ? (
                <Medal color="#C5D0E5" size={23} />
              ) : index === 2 ? (
                <Medal color="#CD8B58" size={23} />
              ) : (
                <Text style={styles.rankNumber}>
                  #{player.leaderboard_rank}
                </Text>
              )}
            </View>

            <View style={styles.playerInfo}>
              <Text style={styles.playerName} numberOfLines={1}>
                {player.display_name || 'Brainy Player'}
              </Text>
              <Text style={styles.playerTag}>
                {player.player_tag || 'PLAYER'}
              </Text>
            </View>

            <View style={styles.stats}>
              <Text style={styles.wins}>{player.wins} WINS</Text>
              <Text style={styles.score}>
                {player.total_score.toLocaleString()} PTS
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        Only completed and recorded battles count toward rankings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 22, paddingBottom: 35 },
  heading: {
    color: C.white,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: C.muted,
    fontSize: 13,
    marginTop: 7,
    marginBottom: 22,
  },
  hero: {
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    padding: 23,
    marginBottom: 27,
  },
  heroTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 15,
    letterSpacing: 1,
  },
  heroSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 7,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionTitle: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  playerCount: {
    color: C.purple,
    fontSize: 10,
    fontWeight: '900',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
  },
  rank: {
    width: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  playerInfo: { flex: 1, marginLeft: 10 },
  playerName: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
  },
  playerTag: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
    letterSpacing: 0.8,
  },
  stats: { alignItems: 'flex-end' },
  wins: {
    color: C.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
  score: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 27,
    alignItems: 'center',
    marginTop: 5,
  },
  emptyTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 13,
    letterSpacing: 1,
  },
  emptyText: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  footer: {
    color: C.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
  },
});
