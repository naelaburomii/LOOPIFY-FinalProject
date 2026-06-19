import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { seedDemoCatalogForBusinessId, DEMO_SEED_STATS } from './demoSeed';
import { getCurrentBusinessId } from './rbac';

const deleteCatalogItem = async (itemType: 'product' | 'category', itemId: string): Promise<void> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const collectionName = itemType === 'category' ? 'productCategories' : 'products';

  try {
    await deleteDoc(doc(db, collectionName, itemId));
  } catch (error: any) {
    if (error?.code === 'permission-denied' || String(error?.message || '').toLowerCase().includes('permission')) {
      throw new Error(
        'Could not delete item. Republish firestore.rules in Firebase Console (Firestore → Rules → Publish), then refresh the app.'
      );
    }
    throw new Error(error?.message || `Failed to delete ${itemType}`);
  }
};

export interface ProductCategory {
  id: string;
  name: string;
  businessId: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  unit: string;
  imageUrl?: string;
  description?: string;
  barcode?: string;
  qrCode?: string;
  stockQty?: number;
  reorderPoint?: number;
  trackInventory?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Categories
export const getCategories = async (): Promise<ProductCategory[]> => {
  if (!auth?.currentUser || !db) {
    return [];
  }

  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) return [];

    try {
      const q = query(
        collection(db, 'productCategories'),
        where('businessId', '==', businessId),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: item.data().createdAt?.toDate(),
      })) as ProductCategory[];
    } catch (orderError: any) {
      if (orderError.code === 'failed-precondition') {
        const q = query(
          collection(db, 'productCategories'),
          where('businessId', '==', businessId)
        );
        const querySnapshot = await getDocs(q);
        const categories = querySnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          createdAt: item.data().createdAt?.toDate(),
        })) as ProductCategory[];
        return categories.sort((a, b) => a.name.localeCompare(b.name));
      }
      throw orderError;
    }
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      return [];
    }
    throw new Error(error.message || 'Failed to fetch categories');
  }
};

export const addCategory = async (name: string): Promise<string> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const businessId = await getCurrentBusinessId();
  if (!businessId) {
    throw new Error('Business profile not found');
  }

  try {
    const docRef = await addDoc(collection(db, 'productCategories'), {
      name: name.trim(),
      businessId,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding category:', error);
    throw new Error(error.message || 'Failed to add category');
  }
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await deleteCatalogItem('category', categoryId);
};

// Products
export const getProducts = async (categoryId?: string): Promise<Product[]> => {
  if (!auth?.currentUser || !db) {
    return [];
  }

  try {
    const businessId = await getCurrentBusinessId();
    if (!businessId) return [];

    let q = query(collection(db, 'products'), where('businessId', '==', businessId));
    if (categoryId) {
      q = query(q, where('categoryId', '==', categoryId));
    }

    try {
      q = query(q, orderBy('name'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        price: item.data().price || 0,
        createdAt: item.data().createdAt?.toDate(),
        updatedAt: item.data().updatedAt?.toDate(),
      })) as Product[];
    } catch (orderError: any) {
      if (orderError.code === 'failed-precondition') {
        let fallbackQuery = query(collection(db, 'products'), where('businessId', '==', businessId));
        if (categoryId) {
          fallbackQuery = query(fallbackQuery, where('categoryId', '==', categoryId));
        }
        const querySnapshot = await getDocs(fallbackQuery);
        const products = querySnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          price: item.data().price || 0,
          createdAt: item.data().createdAt?.toDate(),
          updatedAt: item.data().updatedAt?.toDate(),
        })) as Product[];
        return products.sort((a, b) => a.name.localeCompare(b.name));
      }
      throw orderError;
    }
  } catch (error: any) {
    console.error('Error fetching products:', error);
    if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
      return [];
    }
    throw new Error(error.message || 'Failed to fetch products');
  }
};

export const addProduct = async (
  productData: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const businessId = await getCurrentBusinessId();
  if (!businessId) {
    throw new Error('Business profile not found');
  }

  const cleanProductData: Record<string, unknown> = {
    businessId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  Object.entries(productData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanProductData[key] = value;
    }
  });

  try {
    const docRef = await addDoc(collection(db, 'products'), cleanProductData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error adding product:', error);
    throw new Error(error.message || 'Failed to add product');
  }
};

export const updateProduct = async (
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const cleanUpdates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanUpdates[key] = value;
    }
  });

  try {
    await updateDoc(doc(db, 'products', productId), cleanUpdates);
  } catch (error: any) {
    console.error('Error updating product:', error);
    throw new Error(error.message || 'Failed to update product');
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await deleteCatalogItem('product', productId);
};

export const uploadProductImage = async (imageUri: string, productId?: string): Promise<string> => {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated. Please log in first.');
  }

  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new Error(`Failed to read image file: ${response.status}`);
  }

  const blob = await response.blob();
  const fileName = `${productId || Date.now()}.jpg`;
  const businessId = await getCurrentBusinessId();
  const imageRef = ref(storage, `products/${businessId || auth.currentUser.uid}/${fileName}`);
  await uploadBytes(imageRef, blob);
  return getDownloadURL(imageRef);
};

export const findProductByCode = async (code: string): Promise<Product | null> => {
  if (!db || !auth?.currentUser || !code.trim()) return null;

  const businessId = await getCurrentBusinessId();
  if (!businessId) return null;

  const productQueries = [
    query(collection(db, 'products'), where('businessId', '==', businessId), where('barcode', '==', code)),
    query(collection(db, 'products'), where('businessId', '==', businessId), where('qrCode', '==', code)),
  ];

  for (const q of productQueries) {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const item = snap.docs[0];
      const data = item.data();
      return {
        id: item.id,
        ...data,
        price: data.price || 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as Product;
    }
  }

  return null;
};

export const seedSampleInventory = async (): Promise<{
  categoriesCreated: number;
  productsCreated: number;
}> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const businessId = await getCurrentBusinessId();
  if (!businessId) {
    throw new Error('Business profile not found');
  }

  const result = await seedDemoCatalogForBusinessId(businessId);
  return {
    categoriesCreated: result.categoriesCreated,
    productsCreated: result.productsCreated,
  };
};

export { DEMO_SEED_STATS };
