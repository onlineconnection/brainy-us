import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wifi,
  Trophy,
  UserRound,
  House,
  Swords,
  ChevronLeft,
  Users,
  ShieldCheck,
  Zap,
  Crown,
} from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BattlesScreen from './src/screens/BattlesScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import { supabase } from './src/lib/supabase';

type Screen = 'Home' | 'Battles' | 'Ranks' | 'Profile' | 'Online';

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

function ModeCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.modeCard,
      pressed && styles.pressed,
    ]}>
      <LinearGradient
        colors={['#242044', '#15182C', '#111629']}
        style={styles.modeGradient}
      >
        <View style={styles.modeTop}>
          <View style={[styles.modeIcon, { backgroundColor: `${C.purple}20` }]}>
            <Wifi color={C.purple} size={27} strokeWidth={2.2} />
          </View>
          <View style={[styles.modeNumber, { borderColor: `${C.purple}70` }]}>
            <Text style={[styles.modeNumberText, { color: C.purple }]}>01</Text>
          </View>
        </View>
        <Text style={styles.modeTitle}>ONLINE BATTLE</Text>
        <Text style={styles.modeDescription}>
          Challenge real players. Compete beyond your location.
        </Text>
        <View style={styles.modeBottom}>
          <Text style={[styles.modeAction, { color: C.purple }]}>
            ENTER ONLINE ARENA
          </Text>
          <View style={[styles.modeActionCircle, { backgroundColor: C.purple }]}>
            <Swords color={C.bg} size={17} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Header({ onProfile }: { onProfile: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>BRAINY <Text style={styles.brandAccent}>US</Text></Text>
        <Text style={styles.brandSub}>THINK. COMPETE. DOMINATE.</Text>
      </View>
      <Pressable onPress={onProfile} style={styles.avatar}>
        <UserRound color={C.white} size={21} />
      </Pressable>
    </View>
  );
}

function HomeScreen({ open }: { open: (screen: Screen) => void }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <LinearGradient
        colors={['#211B43', '#14182D', '#101426']}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.heroBadgeText}>THE ARENA AWAITS</Text>
        </View>
        <Text style={styles.heroTitle}>READY TO{'\n'}DOMINATE?</Text>
        <Text style={styles.heroDescription}>
          Your knowledge is your weapon. Enter the arena and prove yourself.
        </Text>
        <View style={styles.heroDecoration}>
          <Zap color="#A990FF" size={52} strokeWidth={1.3} />
        </View>
      </LinearGradient>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>CHOOSE YOUR ARENA</Text>
          <Text style={styles.sectionSubtitle}>One arena. One goal: win.</Text>
        </View>
      </View>

      <ModeCard onPress={() => open('Online')} />

      <View style={styles.infoStrip}>
        <ShieldCheck color={C.cyan} size={19} />
        <Text style={styles.infoText}>REAL PLAYERS. REAL COMPETITION.</Text>
      </View>
    </ScrollView>
  );
}

function ModeScreen({ back }: { back: () => void }) {
  return (
    <View style={styles.detailScreen}>
      <Pressable onPress={back} style={styles.backButton}>
        <ChevronLeft color={C.white} size={21} />
        <Text style={styles.backText}>BACK TO HOME</Text>
      </Pressable>
      <View style={[styles.detailIcon, { backgroundColor: `${C.purple}20` }]}>
        <Wifi color={C.purple} size={38} />
      </View>
      <Text style={styles.detailTitle}>ONLINE BATTLE</Text>
      <Text style={styles.detailDescription}>
        Compete with players around the world in real-time quiz battles.
      </Text>
      <View style={styles.previewPanel}>
        <Text style={styles.previewLabel}>GAME MODE</Text>
        <Text style={styles.previewValue}>INTERNET MULTIPLAYER</Text>
        <View style={styles.panelDivider} />
        <Text style={styles.previewLabel}>PLAYERS</Text>
        <Text style={styles.previewValue}>REAL PLAYERS ONLY</Text>
      </View>
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>MODE PREVIEW</Text>
      </View>
      <Text style={styles.detailFootnote}>
        Online matchmaking and battles are being developed.
      </Text>
    </View>
  );
}

function PlaceholderScreen({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.placeholder}>
      <View style={styles.placeholderIcon}>{icon}</View>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.detailDescription}>{description}</Text>
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>COMING SOON</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('Home');

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          setSession(nextSession);
          setAuthLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navigate = (next: Screen) => setScreen(next);
  const activeTab = screen === 'Online' ? 'Battles' : screen;

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={{ color: C.white, marginTop: 14 }}>Loading Brainy US...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const tabs = [
    { name: 'Home' as Screen, label: 'HOME', icon: <House size={19} /> },
    { name: 'Battles' as Screen, label: 'BATTLES', icon: <Swords size={19} /> },
    { name: 'Ranks' as Screen, label: 'RANKS', icon: <Trophy size={19} /> },
    { name: 'Profile' as Screen, label: 'PROFILE', icon: <UserRound size={19} /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.app}>
        <Header onProfile={() => navigate('Profile')} />

        <View style={styles.content}>
          {screen === 'Home' && <HomeScreen open={navigate} />}

          {screen === 'Online' && (
            <ModeScreen back={() => navigate('Home')} />
          )}

          {screen === 'Battles' && session && (
            <BattlesScreen userId={session.user.id} />
          )}

          {screen === 'Ranks' && <LeaderboardScreen />}

          {screen === 'Profile' && session && (
            <ProfileScreen
              userId={session.user.id}
              email={session.user.email || ''}
            />
          )}
        </View>

        <View style={styles.bottomNav}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.name;
            return (
              <Pressable
                key={tab.name}
                onPress={() => navigate(tab.name)}
                style={styles.navItem}
              >
                <View style={[styles.navIcon, selected && styles.navIconActive]}>
                  {React.cloneElement(tab.icon, {
                    color: selected ? C.purple : C.muted,
                  })}
                </View>
                <Text style={[styles.navLabel, selected && styles.navLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  app: { flex: 1, backgroundColor: C.bg },
  header: {
    height: 76,
    paddingHorizontal: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1B2034',
  },
  brand: { color: C.white, fontSize: 23, fontWeight: '900', letterSpacing: 1.4 },
  brandAccent: { color: C.purple },
  brandSub: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 2.1, marginTop: 3 },
  avatar: {
    width: 43, height: 43, borderRadius: 15,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
  hero: {
    minHeight: 220, borderRadius: 24, padding: 23,
    justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: '#39305E',
    marginBottom: 30,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#30294D', paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 30, marginBottom: 18,
  },
  liveDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: C.cyan, marginRight: 8 },
  heroBadgeText: { color: '#D1C6FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: C.white, fontSize: 37, lineHeight: 40, fontWeight: '900', letterSpacing: -1 },
  heroDescription: { color: '#B3B6CE', fontSize: 12, lineHeight: 19, marginTop: 12, maxWidth: '78%' },
  heroDecoration: { position: 'absolute', right: 19, bottom: 25, opacity: 0.55 },
  sectionHeading: { marginBottom: 17 },
  sectionTitle: { color: C.white, fontSize: 16, fontWeight: '900', letterSpacing: 1.1 },
  sectionSubtitle: { color: C.muted, fontSize: 11, marginTop: 5 },
  modeCard: {
    borderRadius: 21, overflow: 'hidden', marginBottom: 15,
    borderWidth: 1, borderColor: C.border,
  },
  modeGradient: { padding: 19, minHeight: 185 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeIcon: { width: 51, height: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeNumber: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
  modeNumberText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  modeTitle: { color: C.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.7, marginTop: 17 },
  modeDescription: { color: '#A5ADC4', fontSize: 11, lineHeight: 17, marginTop: 6, maxWidth: '88%' },
  modeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17 },
  modeAction: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  modeActionCircle: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  infoStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 15, borderRadius: 14, backgroundColor: '#10242B',
    borderWidth: 1, borderColor: '#1B4149', marginTop: 5,
  },
  infoText: { color: '#A4E7EC', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginLeft: 9 },
  bottomNav: {
    height: 72, backgroundColor: '#0D1020',
    borderTopWidth: 1, borderTopColor: '#20263B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
  navIcon: { width: 42, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  navIconActive: { backgroundColor: '#27203F' },
  navLabel: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  navLabelActive: { color: '#BDAAFF' },
  detailScreen: { flex: 1, padding: 24, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginBottom: 55 },
  backText: { color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginLeft: 6 },
  detailIcon: { width: 82, height: 82, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  detailTitle: { color: C.white, fontSize: 24, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  detailDescription: { color: C.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 12, maxWidth: 310 },
  previewPanel: {
    width: '100%', backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 20, marginTop: 32,
  },
  previewLabel: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  previewValue: { color: C.white, fontSize: 12, fontWeight: '800', marginTop: 7 },
  panelDivider: { height: 1, backgroundColor: C.border, marginVertical: 17 },
  comingSoon: { backgroundColor: '#29213F', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 11, marginTop: 27 },
  comingSoonText: { color: '#C4B1FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  detailFootnote: { color: '#77809B', fontSize: 10, textAlign: 'center', marginTop: 14 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  placeholderIcon: { width: 82, height: 82, borderRadius: 25, backgroundColor: '#24203C', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
