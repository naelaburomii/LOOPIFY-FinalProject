import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useActivityHub, type HubFeedItem } from '../../contexts/ActivityHubContext';

function kindIcon(kind: HubFeedItem['kind']) {
  switch (kind) {
    case 'cart':
      return 'cart-outline';
    case 'incoming_order':
      return 'mail-unread-outline';
    case 'order_status':
      return 'bag-handle-outline';
    case 'chat':
      return 'chatbubble-ellipses-outline';
    case 'low_stock':
      return 'warning-outline';
    case 'request':
      return 'document-text-outline';
    default:
      return 'notifications-outline';
  }
}

export default function NotificationsScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const hub = useActivityHub();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 100,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      color: colors.text,
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    card: {
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 20,
    },
    time: {
      fontSize: 12,
      color: colors.textLight,
      marginTop: 8,
    },
  });

  const openItem = (item: HubFeedItem) => {
    router.push(item.route as any);
  };

  return (
    <View style={styles.container}>
      <Header title="Notifications" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hub.feed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={colors.textLight} />
            <Text variant="headlineSmall" style={styles.emptyStateText}>
              No activity yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
              New orders, messages, cart reminders, low stock, and requests will show here in real time.
            </Text>
          </View>
        ) : (
          <>
            <Text variant="labelLarge" style={{ color: colors.textSecondary, marginBottom: 12 }}>
              Latest activity
            </Text>
            {hub.feed.map((item) => (
              <TouchableOpacity key={item.id} activeOpacity={0.88} onPress={() => openItem(item)}>
                <Card style={styles.card} mode="elevated">
                  <Card.Content>
                    <View style={styles.row}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: isDark ? `${colors.primary}22` : `${colors.primary}12`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={kindIcon(item.kind) as any} size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle} numberOfLines={4}>
                          {item.subtitle}
                        </Text>
                        <Text style={styles.time}>
                          {item.createdAt.toLocaleString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
            <Divider style={{ marginVertical: 16 }} />
            <Text variant="bodySmall" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Tap an item to open the relevant screen. Counts also appear on the tab bar and menu.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
