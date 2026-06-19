import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CartItem } from '../contexts/CartContext';
import { BusinessProfile } from './profile';
import { getCurrentBusinessId } from './rbac';

export interface OrderItem {
  productId: string;
  productName: string;
  categoryName?: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  imageUrl?: string;
  /** Kitchen display: line marked as prepared. */
  prepared?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerAddress?: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierPhone?: string;
  supplierAddress?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  note?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  invoiceStatus?: 'not_sent' | 'sent' | 'paid';
  invoiceReference?: string;
  /** When true, line items were deducted from supplier inventory for this order. */
  inventoryCommitted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mapOrderItems = (items: unknown): OrderItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((raw: Record<string, unknown>) => ({
    productId: String(raw.productId || ''),
    productName: String(raw.productName || ''),
    categoryName: raw.categoryName ? String(raw.categoryName) : undefined,
    unit: String(raw.unit || ''),
    quantity: Number(raw.quantity) || 0,
    pricePerUnit: Number(raw.pricePerUnit) || 0,
    total: Number(raw.total) || 0,
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
    prepared: raw.prepared === true,
  }));
};

/** Firestore rejects undefined field values on nested objects. */
const serializeOrderItemsForFirestore = (items: OrderItem[]): Record<string, unknown>[] =>
  items.map((item) => {
    const payload: Record<string, unknown> = {
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      total: item.total,
      prepared: item.prepared === true,
    };
    if (item.categoryName) payload.categoryName = item.categoryName;
    if (item.imageUrl) payload.imageUrl = item.imageUrl;
    return payload;
  });

/**
 * Create an order from cart items
 */
export const createOrder = async (
  supplierId: string,
  supplierInfo: BusinessProfile,
  items: CartItem[],
  note?: string
): Promise<string> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  const buyerId = (await getCurrentBusinessId()) || auth.currentUser.uid;

  // Get buyer info
  const buyerDoc = await getDoc(doc(db, 'businesses', buyerId));
  if (!buyerDoc.exists()) {
    throw new Error('Buyer profile not found');
  }
  const buyerData = buyerDoc.data();

  // Prepare order items - remove undefined values
  const orderItems: OrderItem[] = items.map((item) => {
    const orderItem: any = {
      productId: item.product.id,
      productName: item.product.name,
      unit: item.product.unit,
      quantity: item.quantity,
      pricePerUnit: item.product.price,
      total: item.product.price * item.quantity,
    };
    
    // Add optional fields only if they exist
    if (item.product.categoryName) {
      orderItem.categoryName = item.product.categoryName;
    }
    if (item.product.imageUrl) {
      orderItem.imageUrl = item.product.imageUrl;
    }
    
    return orderItem as OrderItem;
  });

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal; // Can add tax, shipping, etc. here later

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Create order - remove undefined values
  const orderData: any = {
    orderNumber,
    buyerId,
    buyerName: buyerData.businessName || 'Unknown',
    buyerEmail: buyerData.email || '',
    supplierId,
    supplierName: supplierInfo.businessName || 'Unknown',
    supplierEmail: supplierInfo.email || '',
    items: orderItems,
    subtotal,
    total,
    status: 'pending',
    invoiceStatus: 'not_sent',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Add optional fields only if they exist
  if (buyerData.phoneNumber) {
    orderData.buyerPhone = buyerData.phoneNumber;
  }
  if (buyerData.address) {
    orderData.buyerAddress = buyerData.address;
  }
  if (supplierInfo.phoneNumber) {
    orderData.supplierPhone = supplierInfo.phoneNumber;
  }
  if (supplierInfo.address) {
    orderData.supplierAddress = supplierInfo.address;
  }
  if (note && note.trim()) {
    orderData.note = note.trim();
  }

  const docRef = await addDoc(collection(db, 'orders'), orderData);
  return docRef.id;
};

/**
 * Get orders for the current user (as buyer)
 */
export const getMyOrders = async (): Promise<Order[]> => {
  if (!auth?.currentUser || !db) {
    return [];
  }

  const buyerId = (await getCurrentBusinessId()) || auth.currentUser.uid;

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('buyerId', '==', buyerId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        orderNumber: data.orderNumber || '',
        buyerId: data.buyerId || '',
        buyerName: data.buyerName || '',
        buyerEmail: data.buyerEmail || '',
        buyerPhone: data.buyerPhone || '',
        buyerAddress: data.buyerAddress || '',
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || '',
        supplierEmail: data.supplierEmail || '',
        supplierPhone: data.supplierPhone || '',
        supplierAddress: data.supplierAddress || '',
        items: mapOrderItems(data.items),
        subtotal: data.subtotal || 0,
        total: data.total || 0,
        note: data.note || '',
        status: data.status || 'pending',
        invoiceStatus: data.invoiceStatus || 'not_sent',
        invoiceReference: data.invoiceReference || '',
        inventoryCommitted: data.inventoryCommitted === true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return orders;
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    // If ordering fails, try without orderBy
    if (error.code === 'failed-precondition') {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('buyerId', '==', buyerId));
      const querySnapshot = await getDocs(q);
      const orders: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          orderNumber: data.orderNumber || '',
          buyerId: data.buyerId || '',
          buyerName: data.buyerName || '',
          buyerEmail: data.buyerEmail || '',
          buyerPhone: data.buyerPhone || '',
          buyerAddress: data.buyerAddress || '',
          supplierId: data.supplierId || '',
          supplierName: data.supplierName || '',
          supplierEmail: data.supplierEmail || '',
          supplierPhone: data.supplierPhone || '',
          supplierAddress: data.supplierAddress || '',
          items: mapOrderItems(data.items),
          subtotal: data.subtotal || 0,
          total: data.total || 0,
          note: data.note || '',
          status: data.status || 'pending',
          invoiceStatus: data.invoiceStatus || 'not_sent',
          invoiceReference: data.invoiceReference || '',
          inventoryCommitted: data.inventoryCommitted === true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      // Sort manually
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return orders;
    }
    throw error;
  }
};

/**
 * Get incoming orders for the current user (as supplier)
 */
export const getIncomingOrders = async (): Promise<Order[]> => {
  if (!auth?.currentUser || !db) {
    return [];
  }

  const supplierId = (await getCurrentBusinessId()) || auth.currentUser.uid;

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        orderNumber: data.orderNumber || '',
        buyerId: data.buyerId || '',
        buyerName: data.buyerName || '',
        buyerEmail: data.buyerEmail || '',
        buyerPhone: data.buyerPhone || '',
        buyerAddress: data.buyerAddress || '',
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || '',
        supplierEmail: data.supplierEmail || '',
        supplierPhone: data.supplierPhone || '',
        supplierAddress: data.supplierAddress || '',
        items: mapOrderItems(data.items),
        subtotal: data.subtotal || 0,
        total: data.total || 0,
        note: data.note || '',
        status: data.status || 'pending',
        invoiceStatus: data.invoiceStatus || 'not_sent',
        invoiceReference: data.invoiceReference || '',
        inventoryCommitted: data.inventoryCommitted === true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    return orders;
  } catch (error: any) {
    console.error('Error fetching incoming orders:', error);
    // If ordering fails, try without orderBy
    if (error.code === 'failed-precondition') {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('supplierId', '==', supplierId));
      const querySnapshot = await getDocs(q);
      const orders: Order[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          orderNumber: data.orderNumber || '',
          buyerId: data.buyerId || '',
          buyerName: data.buyerName || '',
          buyerEmail: data.buyerEmail || '',
          buyerPhone: data.buyerPhone || '',
          buyerAddress: data.buyerAddress || '',
          supplierId: data.supplierId || '',
          supplierName: data.supplierName || '',
          supplierEmail: data.supplierEmail || '',
          supplierPhone: data.supplierPhone || '',
          supplierAddress: data.supplierAddress || '',
          items: mapOrderItems(data.items),
          subtotal: data.subtotal || 0,
          total: data.total || 0,
          note: data.note || '',
          status: data.status || 'pending',
          invoiceStatus: data.invoiceStatus || 'not_sent',
          invoiceReference: data.invoiceReference || '',
          inventoryCommitted: data.inventoryCommitted === true,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      // Sort manually
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return orders;
    }
    throw error;
  }
};

const FULFILLMENT_STATUSES: Order['status'][] = ['confirmed', 'processing', 'shipped', 'delivered'];

export const isInvoiceSent = (order: Pick<Order, 'invoiceStatus'>): boolean =>
  order.invoiceStatus === 'sent' || order.invoiceStatus === 'paid';

export const canBuyerCancelOrder = (order: Pick<Order, 'status' | 'invoiceStatus'>): boolean =>
  order.status === 'pending' && !isInvoiceSent(order);

export const canSupplierCancelOrder = (order: Pick<Order, 'status' | 'invoiceStatus'>): boolean =>
  order.status !== 'cancelled' && order.status !== 'delivered' && !isInvoiceSent(order);

/** Buyer cancels a pending order before an invoice is sent. */
export const cancelOrder = async (orderId: string): Promise<void> => {
  if (!db) {
    throw new Error('Database is not configured');
  }

  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error('Order not found');
  }

  const data = orderSnap.data();
  const status = (data.status || 'pending') as Order['status'];
  const currentInvoiceStatus = (data.invoiceStatus || 'not_sent') as Order['invoiceStatus'];

  if (!canBuyerCancelOrder({ status, invoiceStatus: currentInvoiceStatus })) {
    throw new Error(
      isInvoiceSent({ invoiceStatus: currentInvoiceStatus })
        ? 'Cannot cancel an order after the invoice has been sent.'
        : 'Only pending orders can be cancelled.'
    );
  }

  if (data.inventoryCommitted === true) {
    await updateOrderStatus(orderId, 'cancelled');
    return;
  }

  await updateDoc(orderRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Updates order status (and optional invoice fields). When the supplier moves an order from
 * `pending` into fulfillment (`confirmed` … `delivered`), sellable line quantities are deducted
 * once from the supplier's product `stockQty` (skipped when `trackInventory === false` or stock
 * is unset). `inventoryCommitted` on the order prevents double deduction. Cancelling after a
 * commit restores stock; that path must run as the supplier (or via a trusted backend), since
 * buyers cannot write supplier product documents under current rules.
 */
export const updateOrderStatus = async (
  orderId: string,
  status: Order['status'],
  nextInvoiceStatus?: Order['invoiceStatus'],
  invoiceReference?: string
): Promise<void> => {
  if (!db) {
    throw new Error('Database is not configured');
  }

  const firestore = db;
  const orderRef = doc(firestore, 'orders', orderId);

  await runTransaction(firestore, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }

    const data = orderSnap.data();
    const prevStatus = (data.status || 'pending') as Order['status'];
    const currentInvoiceStatus = (data.invoiceStatus || 'not_sent') as Order['invoiceStatus'];
    const supplierId = (data.supplierId || '') as string;

    if (status === 'cancelled' && isInvoiceSent({ invoiceStatus: currentInvoiceStatus })) {
      throw new Error('Cannot cancel an order after the invoice has been sent.');
    }
    const committed = data.inventoryCommitted === true;
    const items = (data.items || []) as OrderItem[];

    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (nextInvoiceStatus) {
      payload.invoiceStatus = nextInvoiceStatus;
    }
    if (invoiceReference !== undefined && invoiceReference !== '') {
      payload.invoiceReference = invoiceReference;
    }

    const fromPending = prevStatus === 'pending';
    const toActive = FULFILLMENT_STATUSES.includes(status);
    const shouldCommitInventory = fromPending && toActive && !committed;
    const shouldRestoreInventory = status === 'cancelled' && committed;

    if (shouldCommitInventory || shouldRestoreInventory) {
      const lineReads: Array<{
        ref: ReturnType<typeof doc>;
        qty: number;
        exists: boolean;
        productData: Record<string, unknown> | null;
      }> = [];

      for (const item of items) {
        const pid = item.productId;
        if (!pid) continue;
        const pref = doc(firestore, 'products', pid);
        const psnap = await transaction.get(pref);
        lineReads.push({
          ref: pref,
          qty: Number(item.quantity) || 0,
          exists: psnap.exists(),
          productData: psnap.exists() ? (psnap.data() as Record<string, unknown>) : null,
        });
      }

      if (shouldCommitInventory) {
        for (const row of lineReads) {
          if (!row.exists || !row.productData) continue;
          const pd = row.productData;
          if (pd.businessId !== supplierId) continue;
          if (pd.trackInventory === false) continue;
          const cur = typeof pd.stockQty === 'number' ? pd.stockQty : undefined;
          if (cur === undefined) continue;
          const nextQty = Math.max(0, cur - row.qty);
          transaction.update(row.ref, {
            stockQty: nextQty,
            updatedAt: serverTimestamp(),
          });
        }
        payload.inventoryCommitted = true;
      } else {
        for (const row of lineReads) {
          if (!row.exists || !row.productData) continue;
          const pd = row.productData;
          if (pd.businessId !== supplierId) continue;
          if (pd.trackInventory === false) continue;
          const cur = typeof pd.stockQty === 'number' ? pd.stockQty : undefined;
          if (cur === undefined) continue;
          const nextQty = cur + row.qty;
          transaction.update(row.ref, {
            stockQty: nextQty,
            updatedAt: serverTimestamp(),
          });
        }
        payload.inventoryCommitted = false;
      }
    }

    transaction.update(orderRef, payload);
  });
};

export const toggleOrderItemPrepared = async (
  orderId: string,
  itemIndex: number
): Promise<void> => {
  if (!db) throw new Error('Database is not configured');
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const data = orderSnap.data();
    const items = mapOrderItems(data.items);
    if (itemIndex < 0 || itemIndex >= items.length) {
      throw new Error('Invalid order line');
    }

    items[itemIndex] = {
      ...items[itemIndex],
      prepared: !items[itemIndex].prepared,
    };

    transaction.update(orderRef, {
      items: serializeOrderItemsForFirestore(items),
      updatedAt: serverTimestamp(),
    });
  });
};

export const setAllOrderItemsPrepared = async (
  orderId: string,
  prepared: boolean
): Promise<void> => {
  if (!db) throw new Error('Database is not configured');
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const data = orderSnap.data();
    const items = mapOrderItems(data.items).map((item) => ({ ...item, prepared }));

    transaction.update(orderRef, {
      items: serializeOrderItemsForFirestore(items),
      updatedAt: serverTimestamp(),
    });
  });
};

