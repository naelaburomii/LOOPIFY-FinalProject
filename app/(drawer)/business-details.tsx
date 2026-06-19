import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Modal, Alert, Platform } from 'react-native';
import { Text, Card, Chip, Avatar, Divider, ActivityIndicator, Button, IconButton, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { useCart } from '../../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinessProfile } from '../../services/profile';
import { BusinessProfile } from '../../services/profile';
import { getProducts } from '../../services/inventory';
import { Product } from '../../services/inventory';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { auth } from '../../config/firebase';
import { useBusinessContext } from '../../contexts/BusinessContext';

export default function BusinessDetailsScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const params = useLocalSearchParams();
  const businessId = params.businessId as string;
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { addToCart } = useCart();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [startingChat, setStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const { businessId: myBusinessId } = useBusinessContext();

  useEffect(() => {
    if (businessId) {
      loadBusinessData();
    }
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadBusinessProfile(), loadBusinessProducts()]);
    } catch (error: any) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBusinessProfile = async () => {
    if (!db || !businessId) return;

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        setBusiness({
          uid: businessDoc.id,
          email: data.email || '',
          businessName: data.businessName || '',
          businessType: data.businessType || '',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          location: data.location || '',
          workHours: data.workHours || '',
          description: data.description || '',
          services: data.services || '',
          logoUrl: data.logoUrl || '',
          coverImageUrl: data.coverImageUrl || '',
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        });
      }
    } catch (error: any) {
      console.error('Error loading business profile:', error);
    }
  };

  const loadBusinessProducts = async () => {
    if (!db || !businessId) return;

    try {
      const q = query(
        collection(db, 'products'),
        where('businessId', '==', businessId)
      );
      
      try {
        const qWithOrder = query(q, orderBy('name'));
        const querySnapshot = await getDocs(qWithOrder);
        const prods = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          price: doc.data().price || 0,
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Product[];
        setAllProducts(prods);
        setProducts(prods);
        extractCategories(prods);
      } catch (orderError: any) {
        // If ordering fails, try without orderBy
        if (orderError.code === 'failed-precondition') {
          const querySnapshot = await getDocs(q);
          const prods = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            price: doc.data().price || 0,
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          })) as Product[];
          const sortedProds = prods.sort((a, b) => a.name.localeCompare(b.name));
          setAllProducts(sortedProds);
          setProducts(sortedProds);
          extractCategories(sortedProds);
        } else {
          throw orderError;
        }
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      setAllProducts([]);
      setProducts([]);
      setCategories([]);
    }
  };

  const extractCategories = (prods: Product[]) => {
    const uniqueCategories = new Set<string>();
    prods.forEach((product) => {
      if (product.categoryName) {
        uniqueCategories.add(product.categoryName);
      }
    });
    setCategories(Array.from(uniqueCategories).sort());
  };

  useEffect(() => {
    if (selectedCategory === 'all') {
      setProducts(allProducts);
    } else {
      setProducts(allProducts.filter((p) => p.categoryName === selectedCategory));
    }
  }, [selectedCategory, allProducts]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadBusinessData();
  };

  const showChatError = (message: string) => {
    setChatError(message);
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Chat unavailable', message);
    }
  };

  const handleStartChat = () => {
    if (!business || startingChat) return;

    if (!auth?.currentUser) {
      showChatError('Sign in to start a chat.');
      return;
    }

    const viewerBusinessId = myBusinessId || auth.currentUser.uid;
    if (viewerBusinessId === business.uid) {
      showChatError('You cannot start a chat with your own business.');
      return;
    }

    setChatError(null);
    setStartingChat(true);

    router.push({
      pathname: '/(drawer)/chat',
      params: {
        businessId: business.uid,
        businessName: business.businessName,
      },
    });

    setStartingChat(false);
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
      paddingBottom: 100,
    },
    coverContainer: {
      width: '100%',
      height: 200,
      position: 'relative',
      backgroundColor: colors.surfaceVariant,
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileSection: {
      padding: 20,
      paddingTop: 80,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    logoContainer: {
      position: 'absolute',
      top: 140,
      left: 20,
      zIndex: 10,
    },
    logo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      borderWidth: 4,
      borderColor: colors.surface,
    },
    logoPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: colors.surface,
    },
    businessInfo: {
      marginTop: 60,
    },
    businessName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    businessType: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoIcon: {
      marginRight: 12,
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    contentSection: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    description: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 20,
    },
    services: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 22,
      marginBottom: 20,
    },
    productsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    categoriesContainer: {
      marginBottom: 20,
    },
    categoriesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      marginRight: 8,
      marginBottom: 8,
    },
    productsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
    productCard: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    productCardWrapper: {
      flex: 1,
    },
    productImage: {
      width: '100%',
      height: 112,
      backgroundColor: colors.surfaceVariant,
    },
    productImagePlaceholder: {
      width: '100%',
      height: 112,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    productInfo: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
      justifyContent: 'space-between',
      gap: 10,
    },
    productName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 19,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
      marginBottom: 2,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    productPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    productPrice: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.primary,
    },
    productUnit: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    productButton: {
      borderRadius: 10,
      marginTop: 4,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    productModalInfo: {
      alignItems: 'center',
      marginBottom: 20,
    },
    modalProductImage: {
      width: 120,
      height: 120,
      borderRadius: 12,
      marginBottom: 12,
    },
    modalProductImagePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 12,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalProductName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    modalProductCategory: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    modalProductPrice: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 8,
    },
    modalProductDescription: {
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
      marginTop: 8,
    },
    quantityContainer: {
      marginVertical: 20,
    },
    quantityLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    quantityInput: {
      width: 80,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    totalPrice: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Business Details" onMenuPress={openDrawer} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Loading business...
          </Text>
        </View>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.container}>
        <Header title="Business Details" onMenuPress={openDrawer} />
        <View style={styles.emptyState}>
          <Ionicons
            name="storefront-outline"
            size={64}
            color={colors.textLight}
          />
          <Text style={styles.emptyStateText}>Business not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={business.businessName} onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {business.coverImageUrl ? (
            <Image
              source={{ uri: business.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons
                name="image-outline"
                size={48}
                color={colors.textLight}
              />
            </View>
          )}
          {/* Logo */}
          <View style={styles.logoContainer}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons
                  name="storefront-outline"
                  size={48}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.profileSection}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{business.businessName}</Text>
            {business.businessType && (
              <Chip
                icon="briefcase"
                style={{ alignSelf: 'flex-start', marginBottom: 16 }}
              >
                {business.businessType}
              </Chip>
            )}

            {business.location && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>{business.location}</Text>
              </View>
            )}

            {business.phoneNumber && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>{business.phoneNumber}</Text>
              </View>
            )}

            {business.workHours && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>{business.workHours}</Text>
              </View>
            )}

            {business.address && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="navigate-outline"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>{business.address}</Text>
              </View>
            )}

            {(myBusinessId || auth?.currentUser?.uid) !== business.uid ? (
              <View style={{ marginTop: 20 }}>
                {chatError ? (
                  <Text style={{ color: colors.warning, marginBottom: 8, textAlign: 'center' }}>
                    {chatError}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={handleStartChat}
                  disabled={startingChat}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: startingChat ? 0.7 : 1,
                  }}
                >
                  {startingChat ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="chatbubble-outline"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                        Start Chat
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Description & Services */}
        {(business.description || business.services) && (
          <View style={styles.contentSection}>
            {business.description && (
              <>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.description}>{business.description}</Text>
              </>
            )}

            {business.services && (
              <>
                <Text style={styles.sectionTitle}>Services</Text>
                <Text style={styles.services}>{business.services}</Text>
              </>
            )}
          </View>
        )}

        {/* Products */}
        <View style={styles.contentSection}>
          <View style={styles.productsHeader}>
            <Text style={styles.sectionTitle}>
              Products ({selectedCategory === 'all' ? allProducts.length : products.length})
            </Text>
          </View>

          {/* Category Filters */}
          {categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <View style={styles.categoriesList}>
                <Chip
                  selected={selectedCategory === 'all'}
                  onPress={() => setSelectedCategory('all')}
                  style={styles.categoryChip}
                >
                  All
                </Chip>
                {categories.map((category) => (
                  <Chip
                    key={category}
                    selected={selectedCategory === category}
                    onPress={() => setSelectedCategory(category)}
                    style={styles.categoryChip}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="cube"
                size={48}
                color={colors.textLight}
              />
              <Text style={styles.emptyStateText}>No products available</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <Card
                  key={product.id}
                  style={styles.productCard}
                  mode="elevated"
                >
                  <View style={styles.productCardWrapper}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedProduct(product);
                        setQuantity('1');
                        setQuantityModalVisible(true);
                      }}
                    >
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons
                            name="cube-outline"
                            size={32}
                            color={colors.textSecondary}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.productInfo}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedProduct(product);
                          setQuantity('1');
                          setQuantityModalVisible(true);
                        }}
                      >
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                        {product.categoryName ? (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText} numberOfLines={1}>
                              {product.categoryName}
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.productPriceRow}>
                          <Text style={styles.productPrice}>₪{product.price.toFixed(2)}</Text>
                          <Text style={styles.productUnit}>per {product.unit}</Text>
                        </View>
                      </TouchableOpacity>
                      <Button
                        mode="contained"
                        icon="cart-plus"
                        onPress={() => {
                          setSelectedProduct(product);
                          setQuantity('1');
                          setQuantityModalVisible(true);
                        }}
                        buttonColor={colors.primary}
                        style={styles.productButton}
                        contentStyle={{ height: 38 }}
                        labelStyle={{ fontSize: 13, fontWeight: '600' }}
                      >
                        Add to Cart
                      </Button>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Quantity Selection Modal */}
      <Modal
        visible={quantityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Cart</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setQuantityModalVisible(false)}
              />
            </View>
            {selectedProduct && (
              <View style={styles.productModalInfo}>
                {selectedProduct.imageUrl ? (
                  <Image
                    source={{ uri: selectedProduct.imageUrl }}
                    style={styles.modalProductImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalProductImagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={48}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                {selectedProduct.categoryName && (
                  <Text style={styles.modalProductCategory}>{selectedProduct.categoryName}</Text>
                )}
                <Text style={styles.modalProductPrice}>
                  ₪{selectedProduct.price.toFixed(2)} / {selectedProduct.unit}
                </Text>
                {selectedProduct.description && (
                  <Text style={styles.modalProductDescription}>{selectedProduct.description}</Text>
                )}
              </View>
            )}
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityControls}>
                <IconButton
                  icon="minus"
                  size={24}
                  onPress={() => {
                    const qty = Math.max(1, parseInt(quantity) - 1);
                    setQuantity(qty.toString());
                  }}
                  disabled={parseInt(quantity) <= 1}
                />
                <TextInput
                  value={quantity}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    setQuantity(Math.max(1, num).toString());
                  }}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.quantityInput}
                  dense
                />
                <IconButton
                  icon="plus"
                  size={24}
                  onPress={() => {
                    const qty = parseInt(quantity) + 1;
                    setQuantity(qty.toString());
                  }}
                />
              </View>
              <Text style={styles.totalPrice}>
                Total: ₪{selectedProduct ? (selectedProduct.price * parseInt(quantity || '1')).toFixed(2) : '0.00'}
              </Text>
            </View>
            <Button
              mode="contained"
              icon="cart-plus"
              onPress={() => {
                if (selectedProduct && business) {
                  addToCart(selectedProduct, business, parseInt(quantity || '1'));
                  setQuantityModalVisible(false);
                }
              }}
              style={{ marginTop: 16 }}
              buttonColor={colors.primary}
            >
              Add to Cart
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

