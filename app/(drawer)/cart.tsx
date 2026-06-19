import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Card, Button, IconButton, Divider, Snackbar } from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useCart } from '../../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CartScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const getSupplierId = (item: typeof items[number]) => item.business.uid || item.product.businessId;

  const handleCheckout = () => {
    if (items.length === 0) {
      setSnackbarMessage('Your cart is empty');
      setSnackbarVisible(true);
      return;
    }

    // Group items by business (supplier)
    const itemsByBusiness = items.reduce((acc, item) => {
      const businessId = getSupplierId(item);
      if (!acc[businessId]) {
        acc[businessId] = {
          business: item.business,
          items: [],
        };
      }
      acc[businessId].items.push(item);
      return acc;
    }, {} as Record<string, { business: typeof items[0]['business']; items: typeof items }>);

    const businessGroups = Object.values(itemsByBusiness);

    if (businessGroups.length === 1) {
      // Single supplier - go directly to checkout
      router.push({
        pathname: '/(drawer)/checkout',
        params: { supplierId: getSupplierId(businessGroups[0].items[0]) },
      });
    } else {
      // Multiple suppliers - show selection or create separate orders
      // For now, let's allow user to checkout with first supplier
      // In future, could show a selection screen
      Alert.alert(
        'Multiple Suppliers',
        `You have items from ${businessGroups.length} different suppliers. You'll need to checkout separately for each supplier.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Checkout First Supplier',
            onPress: () => {
              router.push({
                pathname: '/(drawer)/checkout',
                params: { supplierId: getSupplierId(businessGroups[0].items[0]) },
              });
            },
          },
        ]
      );
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCart();
            setSnackbarMessage('Cart cleared');
            setSnackbarVisible(true);
          },
        },
      ]
    );
  };

  // Group items by business
  const itemsByBusiness = items.reduce((acc, item) => {
    const businessId = getSupplierId(item);
    if (!acc[businessId]) {
      acc[businessId] = {
        business: item.business,
        items: [],
      };
    }
    acc[businessId].items.push(item);
    return acc;
  }, {} as Record<string, { business: typeof items[0]['business']; items: typeof items }>);

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
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    businessSection: {
      marginBottom: 24,
    },
    businessHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    businessLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    businessLogoPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    businessInfo: {
      flex: 1,
    },
    businessName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    businessLocation: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cartItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cartItemRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    cartItemImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 12,
    },
    cartItemImagePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cartItemInfo: {
      flex: 1,
    },
    cartItemName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    cartItemCategory: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    cartItemPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    quantityButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginHorizontal: 16,
      minWidth: 30,
      textAlign: 'center',
    },
    itemTotal: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.text,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 2,
      borderTopColor: colors.primary,
    },
    totalLabel: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
    },
    actionButtons: {
      marginTop: 20,
      gap: 12,
    },
  });

  return (
    <View style={styles.container}>
      <Header title="Shopping Cart" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="cart-outline"
              size={64}
              color={colors.textLight}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>Your cart is empty</Text>
            <Text style={styles.emptyStateSubtext}>
              Browse businesses and add products to your cart
            </Text>
            <Button
              mode="contained"
              icon="store"
              onPress={() => router.push('/(drawer)/browse-businesses')}
              style={{ marginTop: 20 }}
              buttonColor={colors.primary}
            >
              Browse Businesses
            </Button>
          </View>
        ) : (
          <>
            {Object.values(itemsByBusiness).map((group, index) => (
              <View key={getSupplierId(group.items[0])} style={styles.businessSection}>
                <View style={styles.businessHeader}>
                  {group.business.logoUrl ? (
                    <Image
                      source={{ uri: group.business.logoUrl }}
                      style={styles.businessLogo}
                    />
                  ) : (
                    <View style={styles.businessLogoPlaceholder}>
                      <Ionicons
                        name="storefront"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName}>{group.business.businessName}</Text>
                    {group.business.location && (
                      <Text style={styles.businessLocation}>{group.business.location}</Text>
                    )}
                  </View>
                </View>

                {group.items.map((item) => (
                  <Card key={item.id} style={styles.cartItem} mode="elevated">
                    <View style={styles.cartItemRow}>
                      {item.product.imageUrl ? (
                        <Image
                          source={{ uri: item.product.imageUrl }}
                          style={styles.cartItemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.cartItemImagePlaceholder}>
                          <Ionicons
                            name="image-outline"
                            size={32}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        {item.product.categoryName && (
                          <Text style={styles.cartItemCategory}>{item.product.categoryName}</Text>
                        )}
                        <Text style={styles.cartItemPrice}>
                          ₪{item.product.price.toFixed(2)} / {item.product.unit}
                        </Text>
                      </View>
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => removeFromCart(item.id)}
                        iconColor={colors.error}
                      />
                    </View>
                    <View style={styles.quantityRow}>
                      <Text style={styles.itemTotal}>
                        Total: ₪{(item.product.price * item.quantity).toFixed(2)}
                      </Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Ionicons
                            name="remove"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Ionicons
                            name="add"
                            size={20}
                            color={colors.text}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ))}

            {/* Summary */}
            <Card style={styles.summaryCard} mode="elevated">
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>{getTotalItems()}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₪{getTotalPrice().toFixed(2)}</Text>
              </View>
            </Card>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="cart-check"
                onPress={handleCheckout}
                buttonColor={colors.primary}
                style={{ marginBottom: 12 }}
              >
                Checkout
              </Button>
              <Button
                mode="outlined"
                icon="cart-outline"
                onPress={handleClearCart}
                textColor={colors.error}
              >
                Clear Cart
              </Button>
            </View>
          </>
        )}
      </ScrollView>

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

