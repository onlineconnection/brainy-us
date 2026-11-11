import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Wifi,
  Swords,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

const C = {
  bg: '#090B16',
  surface: '#111629',
  border: '#252D47',
  purple: '#9270FF',
  cyan: '#43D9E8',
  white: '#F7F7FC',
  muted: '#929BB5',
};

function ModeCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        pressed && styles.pressed,
      ]}
    >
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

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
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

      <ModeCard onPress={() => router.push('/(tabs)/online')} />

      <View style={styles.infoStrip}>
        <ShieldCheck color={C.cyan} size={19} />
        <Text style={styles.infoText}>REAL PLAYERS. REAL COMPETITION.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  hero: {
    minHeight: 220,
    borderRadius: 24,
    padding: 23,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#39305E',
    marginBottom: 30,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#30294D',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 30,
    marginBottom: 18,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: C.cyan,
    marginRight: 8,
  },
  heroBadgeText: {
    color: '#D1C6FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: C.white,
    fontSize: 37,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#B3B6CE',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: '78%',
  },
  heroDecoration: {
    position: 'absolute',
    right: 19,
    bottom: 25,
    opacity: 0.55,
  },
  sectionHeading: {
    marginBottom: 17,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  modeCard: {
    borderRadius: 21,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  modeGradient: {
    padding: 19,
    minHeight: 185,
  },
  modeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeIcon: {
    width: 51,
    height: 51,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeNumber: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeNumberText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modeTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 17,
  },
  modeDescription: {
    color: '#A5ADC4',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
    maxWidth: '88%',
  },
  modeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 17,
  },
  modeAction: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  modeActionCircle: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#10242B',
    borderWidth: 1,
    borderColor: '#1B4149',
    marginTop: 5,
  },
  infoText: {
    color: '#A4E7EC',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 9,
  },
});
