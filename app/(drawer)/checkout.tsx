import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  TextInput,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useCart } from '../../contexts/CartContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createOrder } from '../../services/orders';
import { getBusinessProfile } from '../../services/profile';
import { BusinessProfile } from '../../services/profile';
import { auth } from '../../config/firebase';

export default function CheckoutScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const params = useLocalSearchParams();
  const routeSupplierId = Array.isArray(params.supplierId) ? params.supplierId[0] : params.supplierId;
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { items, removeItemsBySupplier } = useCart();
  const [supplierInfo, setSupplierInfo] = useState<BusinessProfile | null>(null);
  const [buyerInfo, setBuyerInfo] = useState<BusinessProfile | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const getSupplierId = (item: typeof items[number]) => item.business.uid || item.product.businessId;
  const cartSupplierIds = Array.from(new Set(items.map(getSupplierId).filter(Boolean)));
  const supplierId =
    routeSupplierId && cartSupplierIds.includes(routeSupplierId)
      ? routeSupplierId
      : routeSupplierId || (cartSupplierIds.length === 1 ? cartSupplierIds[0] : undefined);

  // Filter items for this supplier. Older saved cart items can be missing
  // business.uid, so product.businessId is the stable fallback.
  const supplierItems = supplierId
    ? items.filter((item) => getSupplierId(item) === supplierId)
    : [];

  useEffect(() => {
    loadBusinessInfo();
  }, [supplierId, items.length]);

  const loadBusinessInfo = async () => {
    try {
      setLoading(true);
      // Load supplier info
      if (supplierId && supplierItems.length > 0) {
        const supplier = {
          ...supplierItems[0].business,
          uid: supplierId,
        };
        setSupplierInfo(supplier);
      }

      // Load buyer info (current user)
      const buyer = await getBusinessProfile();
      setBuyerInfo(buyer);
    } catch (error: any) {
      console.error('Error loading business info:', error);
      setSnackbarMessage('Error loading business information');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!supplierId || !supplierInfo || supplierItems.length === 0) {
      setSnackbarMessage('Invalid order data');
      setSnackbarVisible(true);
      return;
    }

    try {
      setSubmitting(true);
      await createOrder(supplierId, supplierInfo, supplierItems, note.trim() || undefined);
      setSnackbarMessage('Order placed successfully!');
      setSnackbarVisible(true);

      // Remove ordered items from cart (only items from this supplier)
      removeItemsBySupplier(supplierId);

      // Show the placed order immediately after checkout.
      setTimeout(() => {
        router.replace('/(drawer)/my-orders');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating order:', error);
      setSnackbarMessage(error.message || 'Failed to create order');
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSubtotal = () => {
    return supplierItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
      padding: 20,
      paddingBottom: 100,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      width: 100,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    receiptCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    receiptHeader: {
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    receiptTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    receiptSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    itemDetails: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    itemQuantity: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      width: 60,
      textAlign: 'center',
    },
    itemTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      width: 100,
      textAlign: 'right',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 2,
      borderTopColor: colors.primary,
    },
    summaryLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
    },
    noteInput: {
      backgroundColor: colors.surface,
      marginBottom: 20,
    },
    submitButton: {
      marginTop: 20,
      paddingVertical: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Checkout" showBack onMenuPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Loading order details...
          </Text>
        </View>
      </View>
    );
  }

  if (!supplierInfo || !buyerInfo || supplierItems.length === 0) {
    return (
      <View style={styles.container}>
        <Header title="Checkout" showBack onMenuPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={colors.error}
          />
          <Text style={{ color: colors.text, marginTop: 16, textAlign: 'center' }}>
            Invalid order data. Please go back to your cart and try checkout again.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={{ marginTop: 20 }}
            buttonColor={colors.primary}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const subtotal = calculateSubtotal();
  const total = subtotal;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header title="Checkout" showBack onMenuPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Card style={styles.receiptCard} mode="elevated">
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>ORDER RECEIPT</Text>
              <Text style={styles.receiptSubtitle}>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {/* Supplier Information */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Supplier Information
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Business:</Text>
                <Text style={styles.infoValue}>{supplierInfo.businessName}</Text>
              </View>
              {supplierInfo.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{supplierInfo.email}</Text>
                </View>
              )}
              {supplierInfo.phoneNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{supplierInfo.phoneNumber}</Text>
                </View>
              )}
              {supplierInfo.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{supplierInfo.address}</Text>
                </View>
              )}
              {supplierInfo.location && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location:</Text>
                  <Text style={styles.infoValue}>{supplierInfo.location}</Text>
                </View>
              )}
            </View>

            <Divider style={{ marginVertical: 16 }} />

            {/* Buyer Information */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Order Maker Information
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Business:</Text>
                <Text style={styles.infoValue}>{buyerInfo.businessName}</Text>
              </View>
              {buyerInfo.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{buyerInfo.email}</Text>
                </View>
              )}
              {buyerInfo.phoneNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{buyerInfo.phoneNumber}</Text>
                </View>
              )}
              {buyerInfo.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{buyerInfo.address}</Text>
                </View>
              )}
            </View>

            <Divider style={{ marginVertical: 16 }} />

            {/* Order Items */}
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Order Items
              </Text>
              {supplierItems.map((item, index) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    {item.product.categoryName && (
                      <Text style={styles.itemDetails}>
                        Category: {item.product.categoryName}
                      </Text>
                    )}
                    <Text style={styles.itemPrice}>
                      ₪{item.product.price.toFixed(2)} / {item.product.unit}
                    </Text>
                  </View>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  <Text style={styles.itemTotal}>
                    ₪{(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>₪{total.toFixed(2)}</Text>
            </View>
          </Card>
        </View>

        {/* Note for Supplier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note for Supplier (Optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add any special instructions or notes for the supplier..."
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.noteInput}
            maxLength={500}
          />
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          icon="check-circle"
          onPress={handleSubmitOrder}
          loading={submitting}
          disabled={submitting}
          buttonColor={colors.primary}
          style={styles.submitButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          Place Order
        </Button>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

