import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { logoutBusiness } from '../../services/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutBusiness();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const stats = [
    { label: 'Products', value: '0', icon: 'cube', color: colors.primary },
    { label: 'Orders', value: '0', icon: 'cart', color: colors.secondary },
    { label: 'Revenue', value: '$0', icon: 'cash', color: colors.success },
    { label: 'Customers', value: '0', icon: 'people', color: colors.warning },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text variant="headlineSmall" style={styles.welcomeText}>
                Welcome back!
              </Text>
              <Text variant="titleMedium" style={styles.subtitleText}>
                Your business dashboard
              </Text>
            </View>
            <Avatar.Icon
              size={56}
              icon="store"
              style={styles.avatar}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Card key={index} style={styles.statCard} mode="elevated">
              <Card.Content style={styles.statContent}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <Text variant="headlineSmall" style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  {stat.label}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionCard} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionsGrid}>
              <Button
                mode="contained-tonal"
                icon="plus-circle"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Add Product
              </Button>
              <Button
                mode="contained-tonal"
                icon="store-search"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Browse
              </Button>
              <Button
                mode="contained-tonal"
                icon="file-document"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Orders
              </Button>
              <Button
                mode="contained-tonal"
                icon="account-circle"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Profile
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.activityCard} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Recent Activity
            </Text>
            <View style={styles.emptyState}>
              <Ionicons
                name="bar-chart-outline"
                size={64}
                color={colors.textLight}
              />
              <Text variant="bodyLarge" style={styles.emptyStateText}>
                No recent activity
              </Text>
              <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
                Your business activities will appear here
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          contentStyle={styles.logoutButtonContent}
          labelStyle={styles.logoutButtonLabel}
        >
          Sign Out
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  headerContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  actionCard: {
    marginBottom: 20,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 12,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    marginBottom: 20,
    backgroundColor: colors.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: colors.text,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 20,
    borderColor: colors.error,
    borderRadius: 12,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  logoutButtonLabel: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
