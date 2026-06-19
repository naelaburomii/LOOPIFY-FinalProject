import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Product } from '../services/inventory';
import { BusinessProfile } from '../services/profile';

export interface CartItem {
  id: string;
  product: Product;
  business: BusinessProfile;
  quantity: number;
  addedAt: Date;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, business: BusinessProfile, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  removeItemsBySupplier: (supplierId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsByBusiness: (businessId: string) => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getCartStorageKey = (userId: string) => `@loopify_cart_${userId}`;

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User logged in - load their cart
        setCurrentUserId(user.uid);
      } else {
        // User logged out - clear cart
        setCurrentUserId(null);
        setItems([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load cart when user changes
  useEffect(() => {
    if (currentUserId) {
      loadCart(currentUserId);
    } else {
      setItems([]);
    }
  }, [currentUserId]);

  // Save cart to storage whenever it changes (only if user is logged in)
  useEffect(() => {
    if (currentUserId && items.length >= 0) {
      saveCart(currentUserId);
    }
  }, [items, currentUserId]);

  const loadCart = async (userId: string) => {
    try {
      const storageKey = getCartStorageKey(userId);
      const cartData = await AsyncStorage.getItem(storageKey);
      if (cartData) {
        const parsed = JSON.parse(cartData);
        // Convert dates back from strings
        const cartItems: CartItem[] = parsed.map((item: any) => ({
          ...item,
          addedAt: new Date(item.addedAt),
          product: {
            ...item.product,
            createdAt: item.product.createdAt ? new Date(item.product.createdAt) : undefined,
            updatedAt: item.product.updatedAt ? new Date(item.product.updatedAt) : undefined,
          },
        }));
        setItems(cartItems);
      } else {
        // No cart data for this user - start with empty cart
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setItems([]);
    }
  };

  const saveCart = async (userId: string) => {
    try {
      const storageKey = getCartStorageKey(userId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (product: Product, business: BusinessProfile, quantity: number) => {
    if (!currentUserId) {
      console.warn('Cannot add to cart: User not logged in');
      return;
    }

    setItems((prevItems) => {
      // Check if product already exists in cart from same business
      const existingItemIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && item.business.uid === business.uid
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${product.id}_${business.uid}_${Date.now()}`,
          product,
          business,
          quantity,
          addedAt: new Date(),
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const getSupplierId = (item: CartItem) => item.business.uid || item.product.businessId;

  const removeItemsBySupplier = (supplierId: string) => {
    setItems((prevItems) => prevItems.filter((item) => getSupplierId(item) !== supplierId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getItemsByBusiness = (businessId: string) => {
    return items.filter((item) => getSupplierId(item) === businessId);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        removeItemsBySupplier,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getItemsByBusiness,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
