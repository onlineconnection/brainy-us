import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Clock, Swords, RefreshCw } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

type Battle = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  difficulty: string;
  entry_fee: number;
  currency: string;
  winner_count: number;
  question_count: number;
  duration_minutes: number;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  starts_at: string | null;
};

type Registration = {
  battle_id: string;
  status: string;
  payment_status: string;
};

const C = {
  bg: '#090B16',
  surface: '#111629',
  surface2: '#171E34',
  border: '#252D47',
  purple: '#9270FF',
  cyan: '#43D9E8',
  white: '#F7F7FC',
  muted: '#929BB5',
};

function formatDate(value: string | null) {
  if (!value) return 'To be announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be announced';
  return date.toLocaleString();
}

function money(amount: number, currency: string) {
  return `${Number(amount).toLocaleString()} ${currency}`;
}

export default function BattlesScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadBattles = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [battleResult, registrationResult] = await Promise.all([
        supabase
          .from('battles')
          .select(`
            id, title, description, status, category, difficulty,
            entry_fee, currency, winner_count,
            question_count, duration_minutes,
            registration_opens_at, registration_closes_at, starts_at
          `)
          .neq('status', 'draft')
          .order('starts_at', { ascending: true }),

        supabase
          .from('registrations')
          .select('battle_id, status, payment_status')
          .eq('player_id', userId),
      ]);

      if (battleResult.error) throw battleResult.error;
      if (registrationResult.error) throw registrationResult.error;

      setBattles((battleResult.data || []) as Battle[]);
      setRegistrations((registrationResult.data || []) as Registration[]);
    } catch (err: any) {
      setError(err?.message || 'Could not load battles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBattles();
  }, [loadBattles]);

  const joinBattle = async (battle: Battle) => {
    const now = Date.now();

    if (battle.status !== 'published') {
      Alert.alert('Registration unavailable', 'This battle is not accepting registrations.');
      return;
    }

    if (battle.registration_opens_at &&
        now < new Date(battle.registration_opens_at).getTime()) {
      Alert.alert('Not open yet', 'Registration for this battle has not opened.');
      return;
    }

    if (battle.registration_closes_at &&
        now > new Date(battle.registration_closes_at).getTime()) {
      Alert.alert('Registration closed', 'The registration deadline has passed.');
      return;
    }

    setJoiningId(battle.id);

    try {
      const { data, error: insertError } = await supabase
        .from('registrations')
        .insert({
          battle_id: battle.id,
          player_id: userId,
          status: 'pending',
          payment_status: 'pending',
          entry_fee_paid: 0,
        })
        .select('battle_id, status, payment_status')
        .single();

      if (insertError) throw insertError;

      setRegistrations(previous => [...previous, data as Registration]);

      Alert.alert(
        'Registration submitted',
        battle.entry_fee > 0
          ? 'Your registration is pending. Complete the payment process when it becomes available.'
          : 'Your registration has been submitted and is awaiting approval.'
      );
    } catch (err: any) {
      const message = err?.code === '23505'
        ? 'You have already registered for this battle.'
        : err?.message || 'Registration failed. Please try again.';

      Alert.alert('Could not register', message);
      await loadBattles(true);
    } finally {
      setJoiningId(null);
    }
  };

  const getRegistration = (battleId: string) =>
    registrations.find(item => item.battle_id === battleId);

  const canRegister = (battle: Battle) => {
    const now = Date.now();

    return battle.status === 'published'
      && (!battle.registration_opens_at ||
          now >= new Date(battle.registration_opens_at).getTime())
      && (!battle.registration_closes_at ||
          now <= new Date(battle.registration_closes_at).getTime());
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={styles.loadingText}>Loading battles...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadBattles(true)}
          tintColor={C.purple}
        />
      }
    >
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.heading}>ONLINE BATTLES</Text>
          <Text style={styles.subtitle}>Find your next competition.</Text>
        </View>
        <Pressable onPress={() => loadBattles(true)} style={styles.refreshButton}>
          <RefreshCw size={18} color={C.cyan} />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadBattles()} style={styles.retryButton}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      ) : battles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Swords color={C.purple} size={38} />
          <Text style={styles.emptyTitle}>NO BATTLES AVAILABLE</Text>
          <Text style={styles.emptyText}>
            New competitions will appear here when administrators publish them.
          </Text>
        </View>
      ) : (
        battles.map(battle => {
          const registration = getRegistration(battle.id);
          const joined = !!registration;
          const available = canRegister(battle);

          return (
            <View key={battle.id} style={styles.battleCard}>
              <LinearGradient
                colors={['#211B43', '#15182C', '#111629']}
                style={styles.cardTop}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.category}>{battle.category || 'GENERAL'}</Text>
                  <Text style={styles.status}>{battle.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.title}>{battle.title}</Text>
                <Text style={styles.description}>
                  {battle.description || 'Enter the arena and compete for victory.'}
                </Text>
              </LinearGradient>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>ENTRY FEE</Text>
                    <Text style={styles.detailValue}>
                      {money(battle.entry_fee, battle.currency)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>DIFFICULTY</Text>
                    <Text style={styles.detailValue}>{battle.difficulty}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Swords size={14} color={C.purple} />
                    <Text style={styles.detailValue}>
                      {battle.winner_count} winner(s)
                    </Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <Clock size={15} color={C.muted} />
                  <Text style={styles.dateText}>
                    Starts: {formatDate(battle.starts_at)}
                  </Text>
                </View>

                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>
                    {battle.question_count} questions · {battle.duration_minutes} minutes
                  </Text>
                </View>

                {joined ? (
                  <>
                    <View style={styles.joinedButton}>
                      <Text style={styles.joinedText}>
                        REGISTERED · {registration.status.toUpperCase()}
                      </Text>
                      <Text style={styles.paymentText}>
                        PAYMENT: {registration.payment_status.toUpperCase()}
                      </Text>
                    </View>

                    {registration.status === 'approved' &&
                     ['verified', 'not_required'].includes(registration.payment_status) && (
                      <Pressable
                        onPress={() => router.push({
                          pathname: '/(tabs)/online',
                          params: { battleId: battle.id },
                        })}
                        style={({ pressed }) => [
                          styles.enterLobbyButton,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.enterLobbyText}>ENTER LOBBY</Text>
                      </Pressable>
                    )}
                  </>
                ) : available ? (
                  <Pressable
                    disabled={joiningId === battle.id}
                    onPress={() => joinBattle(battle)}
                    style={({ pressed }) => [
                      styles.joinButton,
                      pressed && { opacity: 0.8 },
                      joiningId === battle.id && { opacity: 0.6 },
                    ]}
                  >
                    {joiningId === battle.id ? (
                      <ActivityIndicator color={C.bg} />
                    ) : (
                      <Text style={styles.joinButtonText}>JOIN BATTLE</Text>
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.unavailableButton}>
                    <Text style={styles.unavailableText}>
                      {battle.status === 'completed'
                        ? 'BATTLE COMPLETED'
                        : battle.status === 'live'
                          ? 'BATTLE IN PROGRESS'
                          : 'REGISTRATION CLOSED'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.muted, marginTop: 13, fontSize: 12 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heading: { color: C.white, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: C.muted, fontSize: 11, marginTop: 5 },
  refreshButton: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  battleCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 17,
  },
  cardTop: { padding: 18 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: { color: C.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  status: {
    color: '#C4B1FF', fontSize: 8, fontWeight: '900',
    backgroundColor: '#30294D', paddingHorizontal: 9,
    paddingVertical: 6, borderRadius: 8,
  },
  title: { color: C.white, fontSize: 19, fontWeight: '900', marginTop: 14 },
  description: { color: '#A5ADC4', fontSize: 11, lineHeight: 17, marginTop: 6 },
  cardDetails: { padding: 17 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailLabel: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  detailValue: { color: C.white, fontSize: 11, fontWeight: '800', marginTop: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  dateText: { color: C.muted, fontSize: 10, flexShrink: 1 },
  joinButton: {
    backgroundColor: C.purple, borderRadius: 12, minHeight: 45,
    alignItems: 'center', justifyContent: 'center', marginTop: 5,
  },
  joinButtonText: { color: C.bg, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  joinedButton: {
    backgroundColor: '#10242B', borderRadius: 12,
    padding: 13, alignItems: 'center', marginTop: 5,
    borderWidth: 1, borderColor: '#1B4149',
  },
  joinedText: { color: C.cyan, fontSize: 10, fontWeight: '900' },
  paymentText: { color: '#A4E7EC', fontSize: 9, marginTop: 5 },
  enterLobbyButton: {
    backgroundColor: C.purple,
    borderRadius: 12,
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  enterLobbyText: {
    color: C.bg,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unavailableButton: {
    backgroundColor: C.surface2, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 5,
  },
  unavailableText: { color: C.muted, fontSize: 10, fontWeight: '900' },
  emptyCard: {
    backgroundColor: C.surface, borderRadius: 19, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
    marginTop: 12,
  },
  emptyTitle: { color: C.white, fontSize: 13, fontWeight: '900', marginTop: 17 },
  emptyText: { color: C.muted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 9 },
  messageCard: {
    backgroundColor: C.surface, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: C.border,
  },
  errorText: { color: '#FF7185', fontSize: 12 },
  retryButton: {
    backgroundColor: C.surface2, padding: 12,
    borderRadius: 10, alignItems: 'center', marginTop: 15,
  },
  retryText: { color: C.white, fontSize: 10, fontWeight: '900' },
});
