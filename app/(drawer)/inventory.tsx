import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal, RefreshControl } from 'react-native';
import { Text, Button, Card, TextInput, Chip, Snackbar, Divider, IconButton, Portal, Dialog } from 'react-native-paper';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import * as ImagePicker from 'expo-image-picker';
import {
  getCategories,
  addCategory,
  deleteCategory,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  seedSampleInventory,
  DEMO_SEED_STATS,
  ProductCategory,
  Product,
} from '../../services/inventory';
import { importInventoryRows } from '../../services/inventoryImport';
import { parseInventoryWorkbook, shareInventoryTemplate, exportCurrentInventory } from '../../utils/inventoryExcel';
import { pickSpreadsheetFile } from '../../utils/pickSpreadsheetFile';
import { createLowStockAlert } from '../../services/alerts';

const UNITS = ['kg', 'L', 'package', 'unit', 'box', 'piece', 'dozen', 'gram', 'liter'];

export default function InventoryScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Category Modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Product Modal
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productUnit, setProductUnit] = useState('unit');
  const [productDescription, setProductDescription] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [productQrCode, setProductQrCode] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<
    { type: 'product'; item: Product } | { type: 'category'; id: string; name: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (productModalVisible && categories.length > 0 && !productCategoryId) {
      setProductCategoryId(categories[0].id);
    }
  }, [productModalVisible, categories]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([getCategories(), getProducts()]);
      setCategories(cats);
      setProducts(prods);
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to load inventory';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        errorMessage = 'Permission denied. Please check your Firestore security rules.';
      }
      // Don't show error if it's just permissions - we handle it gracefully by returning empty arrays
      if (!errorMessage.includes('permission')) {
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDownloadImportTemplate = async () => {
    try {
      await shareInventoryTemplate();
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Could not download template');
      setSnackbarVisible(true);
    }
  };

  const handleExportInventory = async () => {
    try {
      setExporting(true);
      const prods = await getProducts();
      await exportCurrentInventory(prods);
      setSnackbarMessage(`Exported ${prods.length} products to Excel`);
      setSnackbarVisible(true);
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Could not export inventory');
      setSnackbarVisible(true);
    } finally {
      setExporting(false);
    }
  };

  const handleImportExcel = async () => {
    try {
      setImporting(true);
      const fileData = await pickSpreadsheetFile();
      if (!fileData) return;

      const preview = parseInventoryWorkbook(fileData);
      if (preview.rows.length === 0) {
        throw new Error(
          preview.invalidRows[0] || 'No valid rows found. Use the template columns: Name, Category, Price, Stock, Unit, Description.'
        );
      }

      const result = await importInventoryRows(preview.rows);
      await loadData();

      const summary = [
        `${result.productsCreated} added`,
        `${result.productsUpdated} updated`,
        result.categoriesCreated ? `${result.categoriesCreated} categories created` : '',
        result.skipped ? `${result.skipped} skipped` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const warning =
        preview.invalidRows.length > 0 || result.errors.length > 0
          ? ` Some rows were skipped.`
          : '';

      setSnackbarMessage(`Import complete: ${summary}.${warning}`);
      setSnackbarVisible(true);
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to import spreadsheet');
      setSnackbarVisible(true);
    } finally {
      setImporting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setSnackbarMessage('Category name is required');
      setSnackbarVisible(true);
      return;
    }

    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setCategoryModalVisible(false);
      await loadData();
      setSnackbarMessage('Category added successfully!');
      setSnackbarVisible(true);
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to add category';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        errorMessage = 'Permission denied. Please check your Firestore security rules. You need write access to the productCategories collection.';
      }
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setDeleteConfirm({ type: 'category', id: categoryId, name: categoryName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      if (deleteConfirm.type === 'product') {
        await deleteProduct(deleteConfirm.item.id);
        setProducts((current) => current.filter((item) => item.id !== deleteConfirm.item.id));
        setSnackbarMessage(`"${deleteConfirm.item.name}" deleted successfully`);
      } else {
        await deleteCategory(deleteConfirm.id);
        setCategories((current) => current.filter((item) => item.id !== deleteConfirm.id));
        if (selectedCategory === deleteConfirm.id) {
          setSelectedCategory('all');
        }
        setSnackbarMessage(`"${deleteConfirm.name}" deleted successfully`);
      }
      setDeleteConfirm(null);
      setSnackbarVisible(true);
      await loadData();
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to delete item');
      setSnackbarVisible(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      } as any);

      if (!result.canceled && result.assets[0]) {
        setProductImageUri(result.assets[0].uri);
        setProductImageUrl(null);
      }
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to pick image');
      setSnackbarVisible(true);
    }
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductCategoryId(product.categoryId);
      setProductPrice(product.price.toString());
      setProductUnit(product.unit);
      setProductDescription(product.description || '');
      setProductBarcode(product.barcode || '');
      setProductQrCode(product.qrCode || '');
      setStockQty(product.stockQty?.toString() || '');
      setReorderPoint(product.reorderPoint?.toString() || '');
      setProductImageUrl(product.imageUrl || null);
      setProductImageUri(null);
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductCategoryId(categories.length > 0 ? categories[0].id : '');
      setProductPrice('');
      setProductUnit('unit');
      setProductDescription('');
      setProductBarcode('');
      setProductQrCode('');
      setStockQty('');
      setReorderPoint('');
      setProductImageUrl(null);
      setProductImageUri(null);
    }
    setProductModalVisible(true);
  };

  const closeProductModal = () => {
    setProductModalVisible(false);
    setEditingProduct(null);
    setProductName('');
    setProductCategoryId('');
    setProductPrice('');
    setProductUnit('unit');
    setProductDescription('');
    setProductBarcode('');
    setProductQrCode('');
    setStockQty('');
    setReorderPoint('');
    setProductImageUrl(null);
    setProductImageUri(null);
  };

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      setSnackbarMessage('Product name is required');
      setSnackbarVisible(true);
      return;
    }
    if (!productCategoryId) {
      setSnackbarMessage('Please select a category');
      setSnackbarVisible(true);
      return;
    }
    if (!productPrice || parseFloat(productPrice) <= 0) {
      setSnackbarMessage('Please enter a valid price');
      setSnackbarVisible(true);
      return;
    }

    try {
      setSaving(true);
      let imageUrl = productImageUrl;

      // Upload new image if selected
      if (productImageUri) {
        imageUrl = await uploadProductImage(productImageUri, editingProduct?.id);
      }

      const category = categories.find((c) => c.id === productCategoryId);
      const productData: any = {
        name: productName.trim(),
        categoryId: productCategoryId,
        categoryName: category?.name || '',
        price: parseFloat(productPrice),
        unit: productUnit,
      };

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (productDescription.trim()) {
        productData.description = productDescription.trim();
      }
      if (productBarcode.trim()) {
        productData.barcode = productBarcode.trim();
      }
      if (productQrCode.trim()) {
        productData.qrCode = productQrCode.trim();
      }
      if (stockQty.trim()) {
        productData.stockQty = parseInt(stockQty, 10);
        productData.trackInventory = true;
      }
      if (reorderPoint.trim()) {
        productData.reorderPoint = parseInt(reorderPoint, 10);
      }
      if (imageUrl) {
        productData.imageUrl = imageUrl;
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        if (productData.stockQty !== undefined && productData.reorderPoint !== undefined && productData.stockQty <= productData.reorderPoint) {
          await createLowStockAlert(editingProduct.id, productData.name, productData.stockQty, productData.reorderPoint);
        }
        setSnackbarMessage('Product updated successfully!');
      } else {
        const createdId = await addProduct(productData);
        if (productData.stockQty !== undefined && productData.reorderPoint !== undefined && productData.stockQty <= productData.reorderPoint) {
          await createLowStockAlert(createdId, productData.name, productData.stockQty, productData.reorderPoint);
        }
        setSnackbarMessage('Product added successfully!');
      }

      closeProductModal();
      await loadData();
      setSnackbarVisible(true);
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to save product');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteConfirm({ type: 'product', item: product });
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => p.categoryId === selectedCategory);

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
    headerActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
    },
    categoriesContainer: {
      marginBottom: 24,
    },
    categoriesTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
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
    productsContainer: {
      marginBottom: 20,
    },
    productsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    productsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    productsCount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    productCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    productCardWrapper: {
      borderRadius: 12,
    },
    productCardContent: {
      flexDirection: 'row',
      padding: 16,
    },
    productImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      marginRight: 12,
    },
    productImagePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    productInfo: {
      flex: 1,
    },
    productName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    productDetails: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    stockAlertBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 6,
      borderWidth: 1,
    },
    productPrice: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 4,
    },
    productActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
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
    modalScrollView: {
      maxHeight: 600,
    },
    input: {
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    textArea: {
      marginBottom: 16,
      backgroundColor: colors.surface,
      minHeight: 100,
    },
    imagePickerContainer: {
      marginBottom: 16,
    },
    imagePreview: {
      width: 120,
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      marginBottom: 12,
    },
    imagePreviewPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    menuTrigger: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      padding: 12,
      marginBottom: 16,
      minHeight: 56,
      justifyContent: 'center',
    },
    pickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      justifyContent: 'flex-end',
    },
    pickerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 10,
    },
  });

  return (
    <View style={styles.container}>
      <Header title="Inventory Management" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setCategoryModalVisible(true)}
            style={styles.actionButton}
            buttonColor={colors.secondary}
          >
            Add Category
          </Button>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => openProductModal()}
            style={styles.actionButton}
            buttonColor={colors.primary}
          >
            Add Product
          </Button>
        </View>

        <View style={{ marginBottom: 20, gap: 10 }}>
          <Text variant="titleSmall" style={{ color: colors.text, fontWeight: '700' }}>
            Bulk import / export (Excel)
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary, marginBottom: 4 }}>
            Download your current inventory, edit it, and re-import. Columns: Name, Category, Price,
            Stock, Unit, Description.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              mode="contained-tonal"
              icon="file-export-outline"
              loading={exporting}
              disabled={exporting || importing || loading}
              onPress={handleExportInventory}
            >
              Download inventory
            </Button>
            <Button
              mode="outlined"
              icon="file-download-outline"
              onPress={handleDownloadImportTemplate}
              disabled={importing || exporting || loading}
            >
              Download template
            </Button>
            <Button
              mode="contained"
              icon="file-upload-outline"
              loading={importing}
              disabled={importing || exporting || loading}
              onPress={handleImportExcel}
            >
              Import Excel
            </Button>
          </View>
          <Button
            mode="outlined"
            icon="database"
            onPress={async () => {
              try {
                setLoading(true);
                const result = await seedSampleInventory();
                await loadData();
                setSnackbarMessage(
                  `Sample inventory loaded: ${result.categoriesCreated} categories, ${result.productsCreated} products`
                );
                setSnackbarVisible(true);
              } catch (error: any) {
                setSnackbarMessage(error.message || 'Failed to load sample inventory');
                setSnackbarVisible(true);
              } finally {
                setLoading(false);
              }
            }}
            style={{ marginBottom: 16 }}
          >
            Load sample inventory ({DEMO_SEED_STATS.products}+ products)
          </Button>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Categories</Text>
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
                key={category.id}
                selected={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
                onClose={() => handleDeleteCategory(category.id, category.name)}
                style={styles.categoryChip}
              >
                {category.name}
              </Chip>
            ))}
          </View>
        </View>

        {/* Products */}
        <View style={styles.productsContainer}>
          <View style={styles.productsHeader}>
            <Text style={styles.productsTitle}>Products</Text>
            <Text style={styles.productsCount}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="cube"
                size={64}
                color={colors.textLight}
              />
              <Text style={styles.emptyStateText}>No Products</Text>
              <Text style={styles.emptyStateSubtext}>
                {selectedCategory === 'all'
                  ? 'Start by adding your first product'
                  : 'No products in this category'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const qty = product.stockQty;
              const rp = product.reorderPoint;
              const tracked = product.trackInventory !== false;
              const hasQty = typeof qty === 'number';
              const isZero = tracked && hasQty && qty <= 0;
              const isLow = tracked && hasQty && qty > 0 && typeof rp === 'number' && qty <= rp;

              return (
              <Card
                key={product.id}
                style={[
                  styles.productCard,
                  isZero && { borderColor: colors.error, borderWidth: 2 },
                  isLow && !isZero && { borderColor: colors.warning, borderWidth: 2 },
                ]}
                mode="elevated"
              >
                <View style={styles.productCardWrapper}>
                  <Card.Content style={styles.productCardContent}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={32}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDetails}>{product.categoryName}</Text>
                    {product.barcode && (
                      <Text style={styles.productDetails}>Barcode: {product.barcode}</Text>
                    )}
                    {typeof product.stockQty === 'number' && (
                      <View style={{ marginBottom: 2 }}>
                        {isZero && (
                          <View
                            style={[
                              styles.stockAlertBadge,
                              {
                                backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)',
                                borderColor: colors.error,
                              },
                            ]}
                          >
                            <Ionicons name="alert-circle" size={18} color={colors.error} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.error }}>
                              Out of stock
                            </Text>
                          </View>
                        )}
                        {isLow && !isZero && (
                          <View
                            style={[
                              styles.stockAlertBadge,
                              {
                                backgroundColor: isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.18)',
                                borderColor: colors.warning,
                              },
                            ]}
                          >
                            <Ionicons name="warning" size={18} color={colors.warning} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.warning }}>
                              At or below minimum ({rp})
                            </Text>
                          </View>
                        )}
                        <Text
                          style={[
                            styles.productDetails,
                            isZero && { color: colors.error, fontWeight: '800' },
                            isLow && !isZero && { color: colors.warning, fontWeight: '700' },
                          ]}
                        >
                          Stock: {product.stockQty}
                          {typeof product.reorderPoint === 'number'
                            ? ` (Reorder at ${product.reorderPoint})`
                            : ''}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.productPrice}>
                      ₪{product.price.toFixed(2)} / {product.unit}
                    </Text>
                  </View>
                  <View style={styles.productActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openProductModal(product)}
                      iconColor={colors.primary}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteProduct(product)}
                      iconColor={colors.error}
                      accessibilityLabel={`Delete ${product.name}`}
                      hitSlop={8}
                    />
                  </View>
                </Card.Content>
                </View>
              </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setCategoryModalVisible(false)}
              />
            </View>
            <TextInput
              label="Category Name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={styles.input}
              autoFocus
            />
            <Button
              mode="contained"
              onPress={handleAddCategory}
              style={{ marginTop: 8 }}
              buttonColor={colors.primary}
            >
              Add Category
            </Button>
          </View>
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal
        visible={productModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <IconButton icon="close" size={24} onPress={closeProductModal} />
            </View>
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Image Picker */}
              <View style={styles.imagePickerContainer}>
                {productImageUri ? (
                  <Image source={{ uri: productImageUri }} style={styles.imagePreview} />
                ) : productImageUrl ? (
                  <Image source={{ uri: productImageUrl }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePreviewPlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={handleImagePick}
                  style={{ marginBottom: 16 }}
                >
                  {productImageUri || productImageUrl ? 'Change Image' : 'Upload Image'}
                </Button>
              </View>

              <TextInput
                label="Product Name *"
                value={productName}
                onChangeText={setProductName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="cube" />}
              />

              {/* Category Dropdown */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 12, 
                  color: colors.textSecondary, 
                  marginBottom: 4,
                  marginLeft: 4 
                }}>
                  Category *
                </Text>
                <TouchableOpacity
                  style={styles.menuTrigger}
                  onPress={() => {
                    console.log('Category button pressed, categories:', categories.length);
                    console.log('Current categoryPickerVisible state:', categoryPickerVisible);
                    if (categories.length > 0) {
                      console.log('Setting categoryPickerVisible to true');
                      setCategoryPickerVisible(true);
                      // Double check after state update
                      setTimeout(() => {
                        console.log('After state update, categoryPickerVisible should be true');
                      }, 100);
                    } else {
                      setSnackbarMessage('Please add a category first');
                      setSnackbarVisible(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
                    <Text style={{ color: productCategoryId ? colors.text : colors.textSecondary, fontSize: 16, flex: 1 }}>
                      {productCategoryId
                        ? categories.find((c) => c.id === productCategoryId)?.name || 'Select Category'
                        : 'Select Category'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              <TextInput
                label="Price (₪) *"
                value={productPrice}
                onChangeText={setProductPrice}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              {/* Unit Dropdown */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 12, 
                  color: colors.textSecondary, 
                  marginBottom: 4,
                  marginLeft: 4 
                }}>
                  Unit *
                </Text>
                <TouchableOpacity
                  style={styles.menuTrigger}
                  onPress={() => {
                    console.log('Unit button pressed');
                    setUnitPickerVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 }}>
                    <Text style={{ color: productUnit ? colors.text : colors.textSecondary, fontSize: 16, flex: 1 }}>
                      {productUnit || 'Select Unit'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              <TextInput
                label="Barcode"
                value={productBarcode}
                onChangeText={setProductBarcode}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="barcode" />}
                placeholder="Enter or scan barcode"
              />

              <TextInput
                label="QR Code"
                value={productQrCode}
                onChangeText={setProductQrCode}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="qrcode" />}
                placeholder="Optional QR value"
              />

              <TextInput
                label="Stock Quantity"
                value={stockQty}
                onChangeText={setStockQty}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="warehouse" />}
              />

              <TextInput
                label="Reorder Point"
                value={reorderPoint}
                onChangeText={setReorderPoint}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="alert-outline" />}
              />

              <TextInput
                label="Description"
                value={productDescription}
                onChangeText={setProductDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.textArea}
                placeholder="Product description..."
              />

              <Button
                mode="contained"
                onPress={handleSaveProduct}
                loading={saving}
                disabled={saving}
                style={{ marginTop: 8, marginBottom: 20 }}
                buttonColor={colors.primary}
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </ScrollView>

            {/* Category Picker Overlay - Inside Product Modal */}
            {categoryPickerVisible && (
              <View style={styles.pickerOverlay}>
                <TouchableOpacity
                  style={styles.pickerBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    console.log('Backdrop pressed, closing picker');
                    setCategoryPickerVisible(false);
                  }}
                />
                <View style={styles.pickerContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Category</Text>
                    <IconButton
                      icon="close"
                      size={24}
                      onPress={() => {
                        console.log('Close button pressed');
                        setCategoryPickerVisible(false);
                      }}
                    />
                  </View>
                  <ScrollView 
                    style={{ maxHeight: 400 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {categories.length === 0 ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>
                          No categories available. Please add a category first.
                        </Text>
                        <Button
                          mode="contained"
                          onPress={() => {
                            setCategoryPickerVisible(false);
                            setCategoryModalVisible(true);
                          }}
                          buttonColor={colors.primary}
                        >
                          Add Category
                        </Button>
                      </View>
                    ) : (
                      categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => {
                            console.log('Category selected:', category.name);
                            setProductCategoryId(category.id);
                            setCategoryPickerVisible(false);
                          }}
                          activeOpacity={0.7}
                          style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            backgroundColor: productCategoryId === category.id ? colors.surfaceVariant : 'transparent',
                          }}
                        >
                          <Text style={{ color: colors.text, fontSize: 16 }}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Unit Picker Overlay - Inside Product Modal */}
            {unitPickerVisible && (
              <View style={styles.pickerOverlay}>
                <TouchableOpacity
                  style={styles.pickerBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    console.log('Backdrop pressed, closing unit picker');
                    setUnitPickerVisible(false);
                  }}
                />
                <View style={styles.pickerContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Unit</Text>
                    <IconButton
                      icon="close"
                      size={24}
                      onPress={() => setUnitPickerVisible(false)}
                    />
                  </View>
                  <ScrollView 
                    style={{ maxHeight: 400 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        onPress={() => {
                          console.log('Unit selected:', unit);
                          setProductUnit(unit);
                          setUnitPickerVisible(false);
                        }}
                        activeOpacity={0.7}
                        style={{
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                          backgroundColor: productUnit === unit ? colors.surfaceVariant : 'transparent',
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 16 }}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Portal>
        <Dialog
          visible={!!deleteConfirm}
          onDismiss={() => {
            if (!deleting) {
              setDeleteConfirm(null);
            }
          }}
        >
          <Dialog.Title>
            {deleteConfirm?.type === 'category' ? 'Delete Category' : 'Delete Product'}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              {deleteConfirm?.type === 'category'
                ? `Are you sure you want to delete "${deleteConfirm.name}"? Products in this category will not be deleted.`
                : `Are you sure you want to delete "${deleteConfirm?.item.name}"? This action cannot be undone.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              textColor={colors.error}
              onPress={handleConfirmDelete}
            >
              Delete
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
