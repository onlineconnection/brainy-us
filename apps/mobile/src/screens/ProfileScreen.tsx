import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  UserRound,
  AtSign,
  Phone,
  Tag,
  ShieldCheck,
  CalendarDays,
  LogOut,
  Trophy,
  Target,
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type PlayerProfile = {
  username: string | null;
  display_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  player_tag: string | null;
};

type BattleHistory = {
  battle_id: string;
  battle_title: string;
  placement: number | null;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  winnings: number;
  currency: string;
  completed_at: string;
  payout_status: string | null;
  paid_at: string | null;
};

type BattleStats = {
  battles_played: number;
  wins: number;
  total_score: number;
  winnings_by_currency: Record<string, number>;
};

type HistoryResponse = {
  stats: BattleStats;
  history: BattleHistory[];
};

type Props = {
  userId: string;
  email: string;
};

const C = {
  bg: '#090B16',
  surface: '#111629',
  border: '#252D47',
  purple: '#9270FF',
  cyan: '#43D9E8',
  white: '#F7F7FC',
  muted: '#929BB5',
  green: '#50D890',
  red: '#FF7185',
  gold: '#FFD166',
};

const emptyStats: BattleStats = {
  battles_played: 0,
  wins: 0,
  total_score: 0,
  winnings_by_currency: {},
};

export default function ProfileScreen({ userId, email }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<BattleStats>(emptyStats);
  const [history, setHistory] = useState<BattleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    const [profileResult, historyResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name, phone_number, avatar_url, account_status, created_at, player_tag')
        .eq('id', userId)
        .single(),
      supabase.rpc('get_my_battle_history'),
    ]);

    if (profileResult.error) {
      console.error('Profile loading failed:', profileResult.error.message);
      Alert.alert(
        'Profile unavailable',
        'We could not load your player profile. Please try again.'
      );
    } else {
      setProfile(profileResult.data as PlayerProfile);
    }

    if (historyResult.error) {
      console.error('Battle history loading failed:', historyResult.error.message);
      Alert.alert(
        'Battle history unavailable',
        'Your profile loaded, but battle statistics could not be retrieved.'
      );
    } else if (historyResult.data) {
      const result = historyResult.data as HistoryResponse;
      setStats(result.stats || emptyStats);
      setHistory(result.history || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : 'Unavailable';

  const initial = (profile?.display_name || email || 'P')
    .charAt(0)
    .toUpperCase();

  function formatMoney(amount: number, currency: string) {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }

  function detail(label: string, value: string, icon: React.ReactNode) {
    return (
      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>{icon}</View>
        <View style={styles.detailText}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{value}</Text>
        </View>
      </View>
    );
  }

  function statCard(label: string, value: string, icon: React.ReactNode) {
    return (
      <View style={styles.statCard}>
        <View style={styles.statIcon}>{icon}</View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadProfile();
          }}
          tintColor={C.purple}
        />
      }
    >
      <Text style={styles.heading}>PLAYER PROFILE</Text>
      <Text style={styles.subtitle}>Your Brainy US identity and achievements</Text>

      {loading ? (
        <ActivityIndicator size="large" color={C.purple} style={{ marginTop: 50 }} />
      ) : (
        <>
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>

            <Text style={styles.displayName}>
              {profile?.display_name || 'Brainy US Player'}
            </Text>
            <Text style={styles.username}>
              {profile?.username ? `@${profile.username}` : 'Username not set'}
            </Text>

            <View style={styles.tagBadge}>
              <Tag size={14} color={C.purple} />
              <Text style={styles.tagText}>
                {profile?.player_tag || 'PLAYER TAG PENDING'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>BATTLE STATISTICS</Text>

          <View style={styles.statsGrid}>
            {statCard(
              'BATTLES PLAYED',
              String(stats.battles_played),
              <Trophy size={20} color={C.purple} />
            )}
            {statCard(
              'BATTLES WON',
              String(stats.wins),
              <Target size={20} color={C.gold} />
            )}
            {statCard(
              'TOTAL SCORE',
              stats.total_score.toLocaleString(),
              <CheckCircle2 size={20} color={C.cyan} />
            )}
          </View>

          <Text style={styles.sectionTitle}>TOTAL WINNINGS</Text>

          <View style={styles.winningsCard}>
            <Coins size={23} color={C.gold} />
            {Object.keys(stats.winnings_by_currency).length > 0 ? (
              <View style={styles.winningsList}>
                {Object.entries(stats.winnings_by_currency).map(([currency, amount]) => (
                  <View key={currency} style={styles.winningsRow}>
                    <Text style={styles.winningsCurrency}>{currency}</Text>
                    <Text style={styles.winningsAmount}>
                      {Number(amount).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.winningsList}>
                <Text style={styles.winningsAmount}>0</Text>
                <Text style={styles.winningsNote}>No winnings recorded yet</Text>
              </View>
            )}
            <Text style={styles.winningsNote}>Earned from completed battles</Text>
          </View>

          <Text style={styles.sectionTitle}>BATTLE HISTORY</Text>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Trophy size={30} color={C.purple} />
              <Text style={styles.emptyTitle}>NO BATTLES YET</Text>
              <Text style={styles.emptyText}>
                Your completed battles, scores and prizes will appear here.
              </Text>
            </View>
          ) : (
            history.map((battle) => (
              <View key={battle.battle_id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.battleName} numberOfLines={2}>
                      {battle.battle_title || 'Brainy US Battle'}
                    </Text>
                    <Text style={styles.battleDate}>
                      {new Date(battle.completed_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.placementBadge}>
                    <Trophy size={13} color={C.gold} />
                    <Text style={styles.placementText}>
                      {battle.placement ? `#${battle.placement}` : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyDivider} />

                <View style={styles.historyBottom}>
                  <View>
                    <Text style={styles.historyLabel}>SCORE</Text>
                    <Text style={styles.historyValue}>
                      {battle.score.toLocaleString()} PTS
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.historyLabel}>WINNINGS</Text>
                    <Text style={styles.historyWinnings}>
                      {formatMoney(battle.winnings, battle.currency)}
                    </Text>
                  </View>
                  <View style={styles.payoutStatus}>
                    {battle.payout_status === 'paid' ? (
                      <>
                        <CheckCircle2 size={14} color={C.green} />
                        <Text style={[styles.payoutText, { color: C.green }]}>PAID</Text>
                      </>
                    ) : battle.payout_status === 'pending' ? (
                      <>
                        <Clock size={14} color={C.gold} />
                        <Text style={[styles.payoutText, { color: C.gold }]}>PENDING</Text>
                      </>
                    ) : battle.winnings > 0 ? (
                      <>
                        <Clock size={14} color={C.muted} />
                        <Text style={styles.payoutText}>NOT RECORDED</Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} color={C.muted} />
                        <Text style={styles.payoutText}>NO PRIZE</Text>
                      </>
                    )}
                  </View>
                </View>

                <Text style={styles.answerSummary}>
                  {battle.correct_answers} correct · {battle.wrong_answers} incorrect
                </Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>ACCOUNT INFORMATION</Text>

          <View style={styles.detailsCard}>
            {detail('EMAIL ADDRESS', email, <AtSign size={19} color={C.purple} />)}
            {detail('USERNAME', profile?.username || 'Not set', <UserRound size={19} color={C.purple} />)}
            {detail('PHONE NUMBER', profile?.phone_number || 'Not provided', <Phone size={19} color={C.purple} />)}
            {detail('ACCOUNT STATUS', profile?.account_status || 'Unknown', <ShieldCheck size={19} color={C.purple} />)}
            {detail('MEMBER SINCE', joinedDate, <CalendarDays size={19} color={C.purple} />)}
          </View>

          <Pressable
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) Alert.alert('Sign out failed', error.message);
                  },
                },
              ]);
            }}
          >
            <LogOut size={18} color={C.red} />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 22, paddingBottom: 35 },
  heading: { color: C.white, fontSize: 21, fontWeight: '900', letterSpacing: 1.5 },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 7, marginBottom: 24 },
  identityCard: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: C.border,
    padding: 25,
    marginBottom: 28,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#292044',
    borderWidth: 2,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 15,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: C.white, fontSize: 35, fontWeight: '900' },
  displayName: { color: C.white, fontSize: 22, fontWeight: '900' },
  username: { color: C.muted, fontSize: 13, marginTop: 5 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#211B3A',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 17,
  },
  tagText: { color: C.purple, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  sectionTitle: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minHeight: 115,
    backgroundColor: C.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    justifyContent: 'center',
  },
  statIcon: { marginBottom: 10 },
  statValue: { color: C.white, fontSize: 21, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 9, fontWeight: '800', marginTop: 5 },
  winningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 25,
  },
  winningsList: { flex: 1 },
  winningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winningsCurrency: { color: C.muted, fontSize: 12, fontWeight: '800' },
  winningsAmount: { color: C.gold, fontSize: 20, fontWeight: '900' },
  winningsNote: { color: C.muted, fontSize: 10, marginTop: 5 },
  emptyHistory: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 27,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyTitle: { color: C.white, fontSize: 13, fontWeight: '900', marginTop: 13 },
  emptyText: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 11,
  },
  historyTop: { flexDirection: 'row', alignItems: 'center' },
  historyInfo: { flex: 1, paddingRight: 10 },
  battleName: { color: C.white, fontSize: 14, fontWeight: '900' },
  battleDate: { color: C.muted, fontSize: 10, marginTop: 5 },
  placementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#302A1C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  placementText: { color: C.gold, fontSize: 12, fontWeight: '900' },
  historyDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  historyLabel: { color: C.muted, fontSize: 9, fontWeight: '800' },
  historyValue: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 5 },
  historyWinnings: { color: C.gold, fontSize: 12, fontWeight: '900', marginTop: 5 },
  payoutStatus: { alignItems: 'center', gap: 4 },
  payoutText: { color: C.muted, fontSize: 8, fontWeight: '900' },
  answerSummary: { color: C.muted, fontSize: 10, marginTop: 14 },
  detailsCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#211B3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  detailText: { flex: 1 },
  detailLabel: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  detailValue: { color: C.white, fontSize: 14, fontWeight: '600', marginTop: 5 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#633044',
    backgroundColor: '#261521',
    borderRadius: 15,
    padding: 17,
    marginTop: 25,
  },
  signOutText: { color: C.red, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
});
