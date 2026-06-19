import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCurrentBusinessId } from './rbac';

export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentQty: number;
  reorderPoint: number;
  status: 'open' | 'acknowledged';
  createdAt: Date;
}

function mapAlertDocs(snap: QuerySnapshot<DocumentData>): LowStockAlert[] {
  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      productId: data.productId || '',
      productName: data.productName || '',
      currentQty: data.currentQty || 0,
      reorderPoint: data.reorderPoint || 0,
      status: data.status || 'open',
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as LowStockAlert;
  });
}

export const createLowStockAlert = async (
  productId: string,
  productName: string,
  currentQty: number,
  reorderPoint: number
): Promise<void> => {
  if (!db || !auth?.currentUser) return;
  const businessId = (await getCurrentBusinessId()) || auth.currentUser.uid;
  await addDoc(collection(db, 'alerts'), {
    type: 'low_stock',
    businessId,
    productId,
    productName,
    currentQty,
    reorderPoint,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getMyLowStockAlerts = async (): Promise<LowStockAlert[]> => {
  if (!db || !auth?.currentUser) return [];
  const businessId = (await getCurrentBusinessId()) || auth.currentUser.uid;

  const baseConstraints = [
    where('businessId', '==', businessId),
    where('type', '==', 'low_stock'),
  ];

  try {
    const q = query(collection(db, 'alerts'), ...baseConstraints, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return mapAlertDocs(snap);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'failed-precondition') {
      const q = query(collection(db, 'alerts'), ...baseConstraints);
      const snap = await getDocs(q);
      const list = mapAlertDocs(snap);
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list;
    }
    console.error('Error fetching low stock alerts:', error);
    return [];
  }
};

export const acknowledgeAlert = async (alertId: string): Promise<void> => {
  if (!db) return;
  await updateDoc(doc(db, 'alerts', alertId), {
    status: 'acknowledged',
    updatedAt: serverTimestamp(),
  });
};
