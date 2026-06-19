import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Text, Card, Button, IconButton, Divider, Portal, Dialog, Snackbar } from 'react-native-paper';
import { OrderStatusPill } from '../../components/OrderStatusPill';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useCallback, useEffect, useState } from 'react';
import {
  canBuyerCancelOrder,
  cancelOrder,
  getMyOrders,
  isInvoiceSent,
  Order,
  OrderItem,
} from '../../services/orders';
import { useFocusEffect } from 'expo-router';
import { downloadInvoicePdf } from '../../utils/invoicePdf';

function isInvoiceAvailable(order: Order): boolean {
  return isInvoiceSent(order);
}

function isLikelyInvoiceUrl(ref: string): boolean {
  return /^https?:\/\//i.test(ref.trim());
}

export default function MyOrdersScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<Order | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadOrders = useCallback(() => {
    getMyOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const openInvoiceLink = async (url: string) => {
    const trimmed = url.trim();
    try {
      const supported = await Linking.canOpenURL(trimmed);
      if (supported) {
        await Linking.openURL(trimmed);
      }
    } catch {
      // ignore
    }
  };

  const shareInvoice = async (order: Order) => {
    const ref = order.invoiceReference?.trim() || '';
    const lines = [
      `Order: ${order.orderNumber}`,
      `Supplier: ${order.supplierName}`,
      `Total: ₪${order.total.toFixed(2)}`,
      `Invoice status: ${order.invoiceStatus}`,
      ref ? `Invoice reference: ${ref}` : '',
    ].filter(Boolean);
    try {
      await Share.share({
        title: `Invoice — ${order.orderNumber}`,
        message: lines.join('\n'),
      });
    } catch {
      // user cancelled or share failed
    }
  };

  const openCancelConfirm = (order: Order) => {
    if (!canBuyerCancelOrder(order)) {
      setCancelError(
        isInvoiceSent(order)
          ? 'This order cannot be cancelled because the supplier already sent an invoice.'
          : 'Only pending orders can be cancelled.'
      );
      return;
    }
    setCancelError('');
    setCancelConfirmOrder(order);
    setSelectedOrder(null);
  };

  const dismissCancelConfirm = () => {
    if (cancelLoading) return;
    const order = cancelConfirmOrder;
    setCancelConfirmOrder(null);
    setCancelError('');
    if (order) setSelectedOrder(order);
  };

  const confirmCancelOrder = async () => {
    if (!cancelConfirmOrder) return;

    setCancelLoading(true);
    setCancelError('');
    try {
      await cancelOrder(cancelConfirmOrder.id);
      const updated = await getMyOrders();
      setOrders(updated);
      setCancelConfirmOrder(null);
      setSelectedOrder(null);
      setSnackbarMessage('Order cancelled');
      setSnackbarVisible(true);
    } catch (error: any) {
      setCancelError(error?.message || 'Could not cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadPdf = async (order: Order) => {
    setPdfError('');
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(order);
    } catch (error: any) {
      setPdfError(error?.message || 'Could not download invoice PDF.');
    } finally {
      setDownloadingPdf(false);
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
    itemText: {
      color: colors.textSecondary,
      marginTop: 4,
    },
    tapHint: {
      color: colors.primary,
      fontSize: 12,
      marginTop: 10,
    },
    invoiceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
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
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 4,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      paddingLeft: 8,
    },
    modalBody: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    invoiceBox: {
      backgroundColor: isDark ? colors.surfaceVariant : '#EFF6FF',
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    invoiceRef: {
      color: colors.text,
      fontSize: 15,
      marginTop: 8,
      lineHeight: 22,
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
    colProduct: { flex: 1, minWidth: 0 },
    colQty: { width: 52, alignItems: 'center' },
    colLineTotal: { width: 96, alignItems: 'flex-end' },
    productName: { fontSize: 15, fontWeight: '600', color: colors.text },
    productCategory: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    qtyCell: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    lineTotalCell: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' },
    grandTotalBox: {
      marginTop: 20,
      marginBottom: 24,
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? colors.surfaceVariant : colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    grandTotalLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
    grandTotalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
    subtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.container}>
      <Header title="My Orders" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color={colors.textLight} />
            <Text variant="headlineSmall" style={styles.emptyStateText}>
              No Orders Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
              Your orders to other businesses will appear here
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              activeOpacity={0.85}
              onPress={() => {
                setCancelError('');
                setSelectedOrder(order);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Order ${order.orderNumber}, tap for details`}
            >
              <Card style={styles.orderCard} mode="elevated" elevation={1}>
                <Card.Content style={{ paddingVertical: 14 }}>
                  <View style={styles.cardTopRow}>
                    <Text
                      variant="titleMedium"
                      numberOfLines={1}
                      style={{ flex: 1, color: colors.text, fontWeight: '700' }}
                    >
                      {order.supplierName}
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
                    <Text style={styles.dateMeta}>{order.createdAt.toLocaleString()}</Text>
                  </View>
                  {isInvoiceAvailable(order) && (
                    <View style={styles.invoiceBadge}>
                      <Ionicons name="document-text-outline" size={18} color={colors.success} />
                      <Text style={{ color: colors.success, fontWeight: '600', fontSize: 13 }}>
                        Invoice {order.invoiceStatus === 'paid' ? 'paid' : 'available'}
                      </Text>
                    </View>
                  )}
                  {!!order.note && (
                    <Text style={[styles.itemText, { marginTop: 10 }]} numberOfLines={2}>
                      Note: {order.note}
                    </Text>
                  )}
                  <Text style={styles.tapHint}>Tap for full details and invoice</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedOrder(null)}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedOrder?.orderNumber}
              </Text>
              <IconButton icon="close" size={24} onPress={() => setSelectedOrder(null)} />
            </View>
            {selectedOrder && (
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.row}>
                  <Text style={styles.label}>Supplier</Text>
                  <Text style={styles.value}>{selectedOrder.supplierName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Order status</Text>
                  <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                    <OrderStatusPill status={selectedOrder.status} colors={colors} />
                  </View>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Placed</Text>
                  <Text style={styles.value}>
                    {selectedOrder.createdAt.toLocaleString()}
                  </Text>
                </View>
                <Divider style={{ marginVertical: 16 }} />

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
                  {selectedOrder.items.map((item: OrderItem, index: number) => (
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
                  ))}
                </View>

                {!!selectedOrder.note && (
                  <>
                    <Text style={styles.sectionTitle}>Your note</Text>
                    <Text variant="bodyMedium" style={{ color: colors.text, lineHeight: 22 }}>
                      {selectedOrder.note}
                    </Text>
                  </>
                )}

                {isInvoiceAvailable(selectedOrder) ? (
                  <View style={styles.invoiceBox}>
                    <Text variant="titleSmall" style={{ color: colors.text }}>
                      Invoice from seller
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                      Status: {selectedOrder.invoiceStatus}
                    </Text>
                    {!!selectedOrder.invoiceReference?.trim() && (
                      <Text selectable style={styles.invoiceRef}>
                        {selectedOrder.invoiceReference.trim()}
                      </Text>
                    )}
                    {!selectedOrder.invoiceReference?.trim() && (
                      <Text style={[styles.itemText, { marginTop: 8 }]}>
                        The seller marked the invoice as sent. No reference text was added.
                      </Text>
                    )}
                    {selectedOrder.invoiceReference?.trim() &&
                      isLikelyInvoiceUrl(selectedOrder.invoiceReference) && (
                        <Button
                          mode="contained"
                          icon="open-in-new"
                          style={{ marginTop: 12 }}
                          onPress={() => openInvoiceLink(selectedOrder.invoiceReference!)}
                        >
                          Open invoice link
                        </Button>
                      )}
                    <Button
                      mode="contained"
                      icon="file-download-outline"
                      style={{ marginTop: 12 }}
                      loading={downloadingPdf}
                      disabled={downloadingPdf}
                      onPress={() => handleDownloadPdf(selectedOrder)}
                    >
                      Download PDF
                    </Button>
                    {!!pdfError && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>
                        {pdfError}
                      </Text>
                    )}
                    <Button
                      mode="outlined"
                      icon="share-outline"
                      style={{ marginTop: 8 }}
                      onPress={() => shareInvoice(selectedOrder)}
                    >
                      Share invoice details
                    </Button>
                  </View>
                ) : (
                  <View style={[styles.invoiceBox, { marginTop: 16, opacity: 0.9 }]}>
                    <Text style={{ color: colors.textSecondary }}>
                      Invoice not sent yet. When the supplier sends it, open this order again to
                      view the reference or link here.
                    </Text>
                  </View>
                )}

                {canBuyerCancelOrder(selectedOrder) && (
                  <>
                    <Button
                      mode="outlined"
                      icon="close-circle-outline"
                      textColor={colors.error}
                      style={{ marginTop: 8, borderColor: colors.error }}
                      loading={cancelLoading}
                      disabled={cancelLoading}
                      onPress={() => openCancelConfirm(selectedOrder)}
                    >
                      Cancel order
                    </Button>
                    {!!cancelError && (
                      <Text style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>
                        {cancelError}
                      </Text>
                    )}
                  </>
                )}

                <View style={styles.grandTotalBox}>
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
                    {selectedOrder.items.length}{' '}
                    {selectedOrder.items.length === 1 ? 'line' : 'lines'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Portal>
        <Dialog visible={!!cancelConfirmOrder} onDismiss={dismissCancelConfirm}>
          <Dialog.Title>Cancel order?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              Cancel {cancelConfirmOrder?.orderNumber}? This will mark the order as cancelled and
              cannot be undone.
            </Text>
            {!!cancelError && (
              <Text style={{ color: colors.error, fontSize: 13, marginTop: 12 }}>{cancelError}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={cancelLoading} onPress={dismissCancelConfirm}>
              Keep order
            </Button>
            <Button
              loading={cancelLoading}
              disabled={cancelLoading}
              textColor={colors.error}
              onPress={confirmCancelOrder}
            >
              Cancel order
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}
