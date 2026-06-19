import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, ProgressBar, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderItem, setAllOrderItemsPrepared, toggleOrderItemPrepared } from '../services/orders';
import {
  filterKdsOrders,
  formatKdsTime,
  getOrderPrepStats,
  isOrderFullyPrepared,
} from '../utils/orderKds';

interface KdsOrdersViewProps {
  orders: Order[];
  colors: ReturnType<typeof import('../theme/colors').getColors>;
  isDark: boolean;
  onRefresh: () => Promise<void>;
}

export default function KdsOrdersView({ orders, colors, isDark, onRefresh }: KdsOrdersViewProps) {
  const { width } = useWindowDimensions();
  const kdsOrders = filterKdsOrders(orders);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const cardMinWidth = width >= 900 ? 420 : width >= 600 ? 340 : width - 40;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      onRefresh().catch(() => undefined);
    }, 15000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleToggleItem = async (orderId: string, itemIndex: number) => {
    const key = `${orderId}-${itemIndex}`;
    setBusyKey(key);
    try {
      await toggleOrderItemPrepared(orderId, itemIndex);
      await onRefresh();
    } finally {
      setBusyKey(null);
    }
  };

  const handleMarkAll = async (orderId: string, prepared: boolean) => {
    setBusyKey(`${orderId}-all`);
    try {
      await setAllOrderItemsPrepared(orderId, prepared);
      await onRefresh();
    } finally {
      setBusyKey(null);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
      padding: 16,
      paddingBottom: 96,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: width >= 600 ? 'flex-start' : 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 24,
    },
    orderCard: {
      width: cardMinWidth,
      maxWidth: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    orderCardDone: {
      borderColor: colors.success,
      opacity: 0.92,
    },
    orderHeader: {
      padding: 16,
      backgroundColor: isDark ? colors.surfaceVariant : colors.backgroundAlt,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    orderMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    itemsWrap: { padding: 12, gap: 10 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: isDark ? `${colors.primary}18` : `${colors.primary}10`,
    },
    itemRowPrepared: {
      borderColor: colors.success,
      backgroundColor: isDark ? `${colors.success}18` : `${colors.success}12`,
      opacity: 0.75,
    },
    qtyBadge: {
      minWidth: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyBadgePrepared: {
      backgroundColor: colors.success,
    },
    itemName: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 22,
    },
    itemNamePrepared: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    noteBox: {
      marginHorizontal: 12,
      marginBottom: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? '#78350F33' : '#FEF3C7',
      borderWidth: 1,
      borderColor: isDark ? '#92400E' : '#F59E0B',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 12,
      flexWrap: 'wrap',
    },
  });

  const renderItem = (order: Order, item: OrderItem, index: number) => {
    const prepared = item.prepared === true;
    const key = `${order.id}-${index}`;
    const busy = busyKey === key;

    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.85}
        disabled={!!busyKey}
        onPress={() => handleToggleItem(order.id, index)}
        accessibilityRole="button"
        accessibilityLabel={`${item.productName}, quantity ${item.quantity}, ${prepared ? 'prepared' : 'needs preparation'}`}
      >
        <View style={[styles.itemRow, prepared && styles.itemRowPrepared]}>
          <View style={[styles.qtyBadge, prepared && styles.qtyBadgePrepared]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{item.quantity}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, prepared && styles.itemNamePrepared]} numberOfLines={3}>
              {item.productName}
            </Text>
            {!!item.categoryName && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {item.categoryName}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              {prepared ? 'Prepared — tap to undo' : 'Tap when done preparing'}
            </Text>
          </View>
          <Ionicons
            name={prepared ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={prepared ? colors.success : colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (kdsOrders.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Ionicons name="restaurant-outline" size={64} color={colors.textLight} />
        <Text variant="titleLarge" style={{ color: colors.text, marginTop: 16, fontWeight: '700' }}>
          Kitchen clear
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          No active orders to prepare. New pending, confirmed, or processing orders will show here.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {kdsOrders.map((order) => {
        const stats = getOrderPrepStats(order);
        const done = isOrderFullyPrepared(order);
        const progress = stats.total > 0 ? stats.prepared / stats.total : 0;

        return (
          <View key={order.id} style={[styles.orderCard, done && styles.orderCardDone]}>
            <View style={styles.orderHeader}>
              <View style={styles.orderMeta}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleLarge" style={{ fontWeight: '800', color: colors.text }}>
                    {order.buyerName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                    {order.orderNumber} · {formatKdsTime(order.createdAt)}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: done ? `${colors.success}22` : `${colors.warning}22`,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: done ? colors.success : colors.warning }}>
                    {stats.prepared}/{stats.total}
                  </Text>
                </View>
              </View>
              <ProgressBar
                progress={progress}
                color={done ? colors.success : colors.primary}
                style={{ marginTop: 12, height: 8, borderRadius: 4 }}
              />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6, textTransform: 'capitalize' }}>
                Status: {order.status}
              </Text>
            </View>

            {!!order.note && (
              <View style={styles.noteBox}>
                <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>Note</Text>
                <Text style={{ color: colors.text, lineHeight: 20 }}>{order.note}</Text>
              </View>
            )}

            <View style={styles.itemsWrap}>
              {order.items.map((item, index) => renderItem(order, item, index))}
            </View>

            <View style={styles.actions}>
              <Button
                mode="contained-tonal"
                compact
                loading={busyKey === `${order.id}-all`}
                disabled={!!busyKey}
                onPress={() => handleMarkAll(order.id, true)}
              >
                Mark all prepared
              </Button>
              {stats.prepared > 0 && (
                <Button
                  mode="outlined"
                  compact
                  disabled={!!busyKey}
                  onPress={() => handleMarkAll(order.id, false)}
                >
                  Reset
                </Button>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
