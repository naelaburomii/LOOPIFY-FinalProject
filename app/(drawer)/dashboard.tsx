import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { getDashboardMetrics } from '../../services/reports';
import { getCurrentUserRoleProfile } from '../../services/rbac';
import { useActivityHub, type HubFeedItem } from '../../contexts/ActivityHubContext';
import { APP_ROUTES, type UserRole } from '../../types/roles';

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

export default function DashboardScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const hub = useActivityHub();

  const [productCount, setProductCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [attendanceHours, setAttendanceHours] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState<UserRole>('manager');

  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [profile, metrics] = await Promise.all([
        getCurrentUserRoleProfile(),
        getDashboardMetrics(),
      ]);

      setRole(profile.role);
      setProductCount(metrics.productCount);
      setOrdersCount(metrics.ordersCount);
      setRevenue(metrics.totalSales);
      setAttendanceHours(metrics.monthlyAttendanceHours);
      setLowStockCount(metrics.lowStockCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const formatStatValue = (value: string) => (loading ? '—' : value);

  const stats = [
    {
      label: 'Products',
      value: formatStatValue(productCount.toString()),
      icon: 'cube',
      color: colors.primary,
      route: APP_ROUTES.inventory,
    },
    {
      label: 'Orders',
      value: formatStatValue(ordersCount.toString()),
      icon: 'cart',
      color: colors.secondary,
      route: APP_ROUTES.incomingOrders,
    },
    {
      label: 'Revenue',
      value: formatStatValue(`₪${revenue.toFixed(0)}`),
      icon: 'cash',
      color: colors.success,
      route: APP_ROUTES.incomingOrders,
    },
    ...(role === 'manager'
      ? [
          {
            label: 'Team Hrs',
            value: formatStatValue(attendanceHours.toFixed(1)),
            icon: 'time',
            color: colors.warning,
            route: APP_ROUTES.attendance,
          },
        ]
      : []),
    {
      label: 'Low Stock',
      value: formatStatValue(lowStockCount.toString()),
      icon: 'warning',
      color: colors.error,
      route: APP_ROUTES.lowStockAlerts,
    },
  ];

  const recentActivity = hub.feed.slice(0, 6);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    headerSection: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 20,
      backgroundColor: colors.background,
    },
    welcomeText: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 4,
      fontSize: 22,
    },
    subtitleText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      marginBottom: 12,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statContent: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 8,
      minHeight: 150,
      justifyContent: 'space-between',
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
      marginBottom: 8,
      fontSize: 28,
      textAlign: 'center',
      lineHeight: 34,
      flexShrink: 1,
    },
    statLabelContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
      paddingHorizontal: 4,
    },
    statLabel: {
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontSize: 9.5,
      fontWeight: '600',
      textAlign: 'center',
      width: '100%',
      lineHeight: 13,
      paddingHorizontal: 2,
    },
    actionCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontWeight: '700',
      marginBottom: 16,
      color: colors.text,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    seeAllLink: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionItem: {
      flex: 1,
      minWidth: '47%',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    actionLabel: {
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
    },
    activityCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityItemLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    activityIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    activitySubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    activityTime: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 4,
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
  });

  return (
    <View style={styles.container}>
      <Header title="Dashboard" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStats(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitleText}>
            {role === 'manager'
              ? 'Your store overview — orders, inventory, team hours, and alerts'
              : 'Your business overview — orders, products, and stock alerts'}
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard…</Text>
          </View>
        ) : null}

        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => router.push(stat.route as any)}
            >
              <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                    <Ionicons name={stat.icon as any} size={26} color={stat.color} />
                  </View>
                  <Text
                    style={[styles.statValue, { color: stat.color }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {stat.value}
                  </Text>
                  <View style={styles.statLabelContainer}>
                    <Text style={styles.statLabel} numberOfLines={2}>
                      {stat.label}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.actionCard} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push('/(drawer)/inventory')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </View>
                <Text variant="bodyMedium" style={styles.actionLabel}>
                  Add Product
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push('/(drawer)/incoming-orders')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.secondary}15` }]}>
                  <Ionicons name="receipt" size={28} color={colors.secondary} />
                </View>
                <Text variant="bodyMedium" style={styles.actionLabel}>
                  Orders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push('/(drawer)/low-stock-alerts')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: `${colors.error}15` }]}>
                  <Ionicons name="warning" size={28} color={colors.error} />
                </View>
                <Text variant="bodyMedium" style={styles.actionLabel}>
                  Low Stock
                </Text>
              </TouchableOpacity>
              {role === 'manager' ? (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => router.push('/(drawer)/attendance')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="time" size={28} color={colors.warning} />
                  </View>
                  <Text variant="bodyMedium" style={styles.actionLabel}>
                    Attendance
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => router.push('/(drawer)/profile')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="person-circle" size={28} color={colors.warning} />
                  </View>
                  <Text variant="bodyMedium" style={styles.actionLabel}>
                    Profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.activityCard} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleLarge" style={[styles.sectionTitle, { marginBottom: 0 }]}>
                Recent Activity
              </Text>
              {recentActivity.length > 0 ? (
                <TouchableOpacity onPress={() => router.push(APP_ROUTES.notifications as any)}>
                  <Text style={styles.seeAllLink}>See all</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trending-up" size={64} color={colors.textTertiary} />
                <Text variant="bodyLarge" style={styles.emptyStateText}>
                  No recent activity
                </Text>
                <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
                  New orders, low stock alerts, and team updates will appear here
                </Text>
              </View>
            ) : (
              recentActivity.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.88}
                  onPress={() => router.push(item.route as any)}
                  style={[
                    styles.activityItem,
                    index === recentActivity.length - 1 && styles.activityItemLast,
                  ]}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: isDark ? `${colors.primary}22` : `${colors.primary}12` },
                    ]}
                  >
                    <Ionicons name={kindIcon(item.kind) as any} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                    <Text style={styles.activityTime}>{item.createdAt.toLocaleString()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}
