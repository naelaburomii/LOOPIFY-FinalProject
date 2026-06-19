import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCurrentStoreId } from './rbac';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId?: string;
  role: string;
  startAt: Date;
  endAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

const mapShift = (item: { id: string; data: () => Record<string, any> }): Shift => {
  const data = item.data();
  return {
    id: item.id,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    storeId: data.storeId,
    role: data.role || 'Employee',
    startAt: data.startAt?.toDate?.() || new Date(data.startAt),
    endAt: data.endAt?.toDate?.() || new Date(data.endAt),
    status: data.status || 'scheduled',
    notes: data.notes || '',
  };
};

export const createShift = async (payload: Omit<Shift, 'id' | 'status' | 'storeId'>): Promise<string> => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }
  const storeId = await getCurrentStoreId();
  const shiftData = {
    ...payload,
    storeId,
    status: 'scheduled',
    startAt: payload.startAt,
    endAt: payload.endAt,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'shifts'), shiftData);
  return ref.id;
};

export const getMyShifts = async (): Promise<Shift[]> => {
  if (!auth?.currentUser || !db) return [];
  const q = query(
    collection(db, 'shifts'),
    where('employeeId', '==', auth.currentUser.uid),
    orderBy('startAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapShift);
};

export const getAllShifts = async (): Promise<Shift[]> => {
  if (!db) return [];
  const storeId = await getCurrentStoreId();
  const q = query(
    collection(db, 'shifts'),
    where('storeId', '==', storeId),
    orderBy('startAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapShift);
};

export const updateShiftStatus = async (shiftId: string, status: Shift['status']): Promise<void> => {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'shifts', shiftId), {
    status,
    updatedAt: serverTimestamp(),
  });
};
