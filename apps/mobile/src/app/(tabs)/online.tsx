import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wifi, Swords } from 'lucide-react-native';

const C = {
  bg: '#090B16',
  surface: '#0D1020',
  border: '#20263B',
  purple: '#9270FF',
  white: '#F7F7FC',
  muted: '#929BB5',
};

export default function OnlineRoute() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft color={C.muted} size={18} />
        <Text style={styles.backText}>BACK TO HOME</Text>
      </Pressable>

      <LinearGradient
        colors={['#292044', '#15182C']}
        style={styles.detailIcon}
      >
        <Wifi color={C.purple} size={38} />
      </LinearGradient>

      <Text style={styles.detailTitle}>ONLINE BATTLE</Text>

      <Text style={styles.detailDescription}>
        Challenge real players and compete beyond your location.
      </Text>

      <View style={styles.previewPanel}>
        <Text style={styles.previewLabel}>GAME MODE</Text>
        <Text style={styles.previewValue}>Multiplayer Battle Royale</Text>

        <View style={styles.panelDivider} />

        <Text style={styles.previewLabel}>STATUS</Text>
        <Text style={styles.previewValue}>Gameplay development in progress</Text>
      </View>

      <View style={styles.comingSoon}>
        <Swords color="#C4B1FF" size={16} />
        <Text style={styles.comingSoonText}>COMING SOON</Text>
      </View>

      <Text style={styles.detailFootnote}>
        Get ready to test your knowledge against other players.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 24,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 55,
  },
  backText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 6,
  },
  detailIcon: {
    width: 82,
    height: 82,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  detailTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  detailDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 310,
  },
  previewPanel: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginTop: 32,
  },
  previewLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  previewValue: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  panelDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 17,
  },
  comingSoon: {
    backgroundColor: '#29213F',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 11,
    marginTop: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comingSoonText: {
    color: '#C4B1FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  detailFootnote: {
    color: '#77809B',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 14,
  },
});
