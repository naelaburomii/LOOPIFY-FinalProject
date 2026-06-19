import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Text, Card, Button, TextInput, Divider, IconButton, Chip, SegmentedButtons, Portal, Dialog } from 'react-native-paper';
import { OrderStatusPill } from '../../components/OrderStatusPill';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  canSupplierCancelOrder,
  getIncomingOrders,
  Order,
  OrderItem,
  updateOrderStatus,
} from '../../services/orders';
import KdsOrdersView from '../../components/KdsOrdersView';
import { getOrderPrepStats } from '../../utils/orderKds';

type WorkflowOrderStatus = 'confirmed' | 'processing' | 'shipped' | 'delivered';

function workflowStatusButtonProps(
  orderStatus: Order['status'],
  target: WorkflowOrderStatus,
  primary: string
) {
  const cancelled = orderStatus === 'cancelled';
  const active = !cancelled && orderStatus === target;
  return {
    mode: (active ? 'contained' : 'outlined') as 'contained' | 'outlined',
    buttonColor: active ? primary : undefined,
    textColor: active ? '#FFFFFF' : undefined,
  };
}

export default function IncomingOrdersScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoiceRefByOrder, setInvoiceRefByOrder] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kds'>('list');
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    const data = await getIncomingOrders();
    setOrders(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const closeDetail = () => setSelectedOrder(null);

  const refreshAndKeepSelection = async (orderId: string) => {
    const data = await getIncomingOrders();
    setOrders(data);
    const updated = data.find((o) => o.id === orderId);
    if (updated) setSelectedOrder(updated);
  };

  const runOrderAction = async (fn: () => Promise<void>) => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      await fn();
      await refreshAndKeepSelection(selectedOrder.id);
    } finally {
      setActionLoading(false);
    }
  };

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
      paddingBottom: 32,
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
    orderCard: {
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    totalHighlight: {
      marginTop: 14,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 2,
    },
    countBadge: {
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
    },
    dateMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
      textAlign: 'right',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 6,
    },
    label: {
      color: colors.textSecondary,
    },
    value: {
      color: colors.text,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    tapHint: {
      color: colors.primary,
      fontSize: 12,
      marginTop: 10,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '94%',
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingTop: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitleBlock: {
      flex: 1,
      paddingLeft: 12,
      paddingVertical: 8,
    },
    modalScroll: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    listTable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginTop: 4,
    },
    listHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? colors.surfaceVariant : colors.backgroundAlt,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    listHeaderCell: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    colProduct: {
      flex: 1,
      minWidth: 0,
    },
    colQty: {
      width: 52,
      alignItems: 'center',
    },
    colLineTotal: {
      width: 96,
      alignItems: 'flex-end',
    },
    productName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    productCategory: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    qtyCell: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    lineTotalCell: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'right',
    },
    grandTotalBox: {
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? colors.surfaceVariant : colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    grandTotalLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    grandTotalValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    subtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    actionsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
  });

  const renderProductRow = (item: OrderItem, index: number) => (
    <View key={`${item.productId}-${index}`} style={styles.listRow}>
      <View style={styles.colProduct}>
        <Text style={styles.productName} numberOfLines={3}>
          {item.productName}
        </Text>
        {!!item.categoryName && (
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.categoryName}
          </Text>
        )}
        <Text style={[styles.productCategory, { marginTop: 4 }]}>
          ₪{item.pricePerUnit.toFixed(2)} / {item.unit}
        </Text>
      </View>
      <View style={styles.colQty}>
        <Text style={styles.qtyCell}>{item.quantity}</Text>
      </View>
      <View style={styles.colLineTotal}>
        <Text style={styles.lineTotalCell}>₪{item.total.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Incoming Orders" onMenuPress={openDrawer} />
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'list' | 'kds')}
          buttons={[
            { value: 'list', label: 'List', icon: 'format-list-bulleted' },
            { value: 'kds', label: 'KDS', icon: 'monitor-dashboard' },
          ]}
        />
      </View>
      {viewMode === 'kds' ? (
        <KdsOrdersView orders={orders} colors={colors} isDark={isDark} onRefresh={load} />
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={64} color={colors.textLight} />
            <Text variant="headlineSmall" style={styles.emptyStateText}>
              No Incoming Orders
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
              Orders from other businesses will appear here
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.88}
              onPress={() => {
                setSelectedOrder(order);
                setInvoiceRefByOrder((prev) => ({
                  ...prev,
                  [order.id]: prev[order.id] ?? order.invoiceReference ?? '',
                }));
              }}
              accessibilityRole="button"
              accessibilityLabel={`Order ${order.orderNumber}, open details`}
            >
              <Card style={styles.orderCard} mode="elevated" elevation={1}>
                <Card.Content style={{ paddingVertical: 14 }}>
                  <View style={styles.cardTopRow}>
                    <Text
                      variant="titleMedium"
                      numberOfLines={1}
                      style={{ flex: 1, color: colors.text, fontWeight: '700' }}
                    >
                      {order.buyerName}
                    </Text>
                    <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    <OrderStatusPill status={order.status} colors={colors} />
                    <Text
                      style={{ fontSize: 12, color: colors.textSecondary, flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {order.orderNumber}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.totalHighlight,
                      {
                        backgroundColor: isDark ? `${colors.primary}22` : `${colors.primary}12`,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>
                      Order total
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>
                      ₪{order.total.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        {order.items.length} {order.items.length === 1 ? 'product' : 'products'}
                      </Text>
                    </View>
                    {(() => {
                      const prep = getOrderPrepStats(order);
                      if (prep.total === 0 || prep.prepared === 0) return null;
                      return (
                        <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600' }}>
                          KDS: {prep.prepared}/{prep.total} prepared
                        </Text>
                      );
                    })()}
                    <Text style={styles.dateMeta}>{order.createdAt.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.tapHint}>Tap for full details, products, and actions</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      )}

      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={closeDetail}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDetail} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text variant="titleLarge" numberOfLines={1}>
                  {selectedOrder?.orderNumber}
                </Text>
                <View style={styles.chipRow}>
                  {selectedOrder && <OrderStatusPill status={selectedOrder.status} colors={colors} />}
                  {selectedOrder?.invoiceStatus && selectedOrder.invoiceStatus !== 'not_sent' && (
                    <Chip compact mode="flat" style={{ alignSelf: 'flex-start' }}>
                      Invoice: {selectedOrder.invoiceStatus}
                    </Chip>
                  )}
                </View>
              </View>
              <IconButton icon="close" size={24} onPress={closeDetail} />
            </View>

            {selectedOrder && (
              <ScrollView
                style={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionTitle}>Order</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Placed</Text>
                  <Text style={styles.value}>{selectedOrder.createdAt.toLocaleString()}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Last updated</Text>
                  <Text style={styles.value}>{selectedOrder.updatedAt.toLocaleString()}</Text>
                </View>

                <Text style={styles.sectionTitle}>Buyer</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Business</Text>
                  <Text style={styles.value}>{selectedOrder.buyerName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{selectedOrder.buyerEmail || '—'}</Text>
                </View>
                {!!selectedOrder.buyerPhone && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Phone</Text>
                    <Text style={styles.value}>{selectedOrder.buyerPhone}</Text>
                  </View>
                )}
                {!!selectedOrder.buyerAddress && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Address</Text>
                    <Text style={styles.value}>{selectedOrder.buyerAddress}</Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Products</Text>
                <View style={styles.listTable}>
                  <View style={styles.listHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listHeaderCell}>Product</Text>
                    </View>
                    <View style={{ width: 52, alignItems: 'center' }}>
                      <Text style={styles.listHeaderCell}>Qty</Text>
                    </View>
                    <View style={{ width: 96, alignItems: 'flex-end' }}>
                      <Text style={styles.listHeaderCell}>Total</Text>
                    </View>
                  </View>
                  {selectedOrder.items.map((item, index) => renderProductRow(item, index))}
                </View>

                {!!selectedOrder.note && (
                  <>
                    <Text style={styles.sectionTitle}>Buyer note</Text>
                    <Text variant="bodyMedium" style={{ color: colors.text, lineHeight: 22 }}>
                      {selectedOrder.note}
                    </Text>
                  </>
                )}

                <Text style={styles.sectionTitle}>Invoice</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Status</Text>
                  <Text style={styles.value}>{selectedOrder.invoiceStatus || 'not_sent'}</Text>
                </View>
                {!!selectedOrder.invoiceReference?.trim() && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Reference</Text>
                    <Text selectable style={{ color: colors.text, marginTop: 4, lineHeight: 22 }}>
                      {selectedOrder.invoiceReference.trim()}
                    </Text>
                  </View>
                )}

                <Divider style={{ marginVertical: 20 }} />

                <Text style={styles.sectionTitle}>Update status</Text>
                <View style={styles.actionsWrap}>
                  <Button
                    {...workflowStatusButtonProps(
                      selectedOrder.status,
                      'confirmed',
                      colors.primary
                    )}
                    compact
                    loading={actionLoading}
                    disabled={actionLoading || selectedOrder.status === 'cancelled'}
                    onPress={() =>
                      runOrderAction(() => updateOrderStatus(selectedOrder.id, 'confirmed'))
                    }
                  >
                    Confirm
                  </Button>
                  <Button
                    {...workflowStatusButtonProps(
                      selectedOrder.status,
                      'processing',
                      colors.primary
                    )}
                    compact
                    loading={actionLoading}
                    disabled={actionLoading || selectedOrder.status === 'cancelled'}
                    onPress={() =>
                      runOrderAction(() => updateOrderStatus(selectedOrder.id, 'processing'))
                    }
                  >
                    Processing
                  </Button>
                  <Button
                    {...workflowStatusButtonProps(
                      selectedOrder.status,
                      'shipped',
                      colors.primary
                    )}
                    compact
                    loading={actionLoading}
                    disabled={actionLoading || selectedOrder.status === 'cancelled'}
                    onPress={() =>
                      runOrderAction(() => updateOrderStatus(selectedOrder.id, 'shipped'))
                    }
                  >
                    Shipped
                  </Button>
                  <Button
                    {...workflowStatusButtonProps(
                      selectedOrder.status,
                      'delivered',
                      colors.primary
                    )}
                    compact
                    loading={actionLoading}
                    disabled={actionLoading || selectedOrder.status === 'cancelled'}
                    onPress={() =>
                      runOrderAction(() => updateOrderStatus(selectedOrder.id, 'delivered'))
                    }
                  >
                    Delivered
                  </Button>
                  <Button
                    mode="outlined"
                    textColor={colors.error}
                    compact
                    loading={actionLoading}
                    disabled={actionLoading || !canSupplierCancelOrder(selectedOrder)}
                    onPress={() => setCancelConfirmVisible(true)}
                  >
                    Cancel
                  </Button>
                </View>

                <TextInput
                  mode="outlined"
                  label="Invoice reference (for buyer)"
                  value={invoiceRefByOrder[selectedOrder.id] ?? ''}
                  onChangeText={(text) =>
                    setInvoiceRefByOrder((prev) => ({ ...prev, [selectedOrder.id]: text }))
                  }
                  style={{ marginTop: 12 }}
                  disabled={actionLoading}
                />
                <Button
                  mode="contained"
                  style={{ marginTop: 12, marginBottom: 8 }}
                  loading={actionLoading}
                  disabled={actionLoading}
                  onPress={() =>
                    runOrderAction(() =>
                      updateOrderStatus(
                        selectedOrder.id,
                        selectedOrder.status,
                        'sent',
                        invoiceRefByOrder[selectedOrder.id] || ''
                      )
                    )
                  }
                >
                  Send invoice
                </Button>

                <View style={[styles.grandTotalBox, { marginTop: 20, marginBottom: 24 }]}>
                  <Text style={styles.grandTotalLabel}>Total for this order</Text>
                  {Math.abs(selectedOrder.subtotal - selectedOrder.total) > 0.009 && (
                    <View style={styles.subtotalRow}>
                      <Text style={{ color: colors.textSecondary }}>Subtotal</Text>
                      <Text style={{ fontWeight: '600', color: colors.text }}>
                        ₪{selectedOrder.subtotal.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.grandTotalValue}>₪{selectedOrder.total.toFixed(2)}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                    {selectedOrder.items.reduce((n, i) => n + i.quantity, 0)} units across{' '}
                    {selectedOrder.items.length} {selectedOrder.items.length === 1 ? 'line' : 'lines'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Portal>
        <Dialog
          visible={cancelConfirmVisible && !!selectedOrder}
          onDismiss={() => {
            if (!actionLoading) setCancelConfirmVisible(false);
          }}
        >
          <Dialog.Title>Cancel order?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              Cancel {selectedOrder?.orderNumber} from {selectedOrder?.buyerName}? Stock will be
              restored if it was already deducted.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={actionLoading} onPress={() => setCancelConfirmVisible(false)}>
              Keep order
            </Button>
            <Button
              loading={actionLoading}
              disabled={actionLoading}
              textColor={colors.error}
              onPress={() =>
                runOrderAction(async () => {
                  await updateOrderStatus(selectedOrder!.id, 'cancelled');
                  setCancelConfirmVisible(false);
                })
              }
            >
              Cancel order
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
