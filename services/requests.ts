import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getWorkforceStoreId, getCurrentStoreId } from './rbac';
import { getTeamUsers } from './teamUsers';

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId?: string;
  type: 'leave' | 'shift_change' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
}

const mapRequest = (item: { id: string; data: () => Record<string, any> }): EmployeeRequest => {
  const data = item.data();
  return {
    id: item.id,
    employeeId: data.employeeId,
    employeeName: data.employeeName || 'Employee',
    storeId: data.storeId,
    type: data.type || 'other',
    reason: data.reason || '',
    status: data.status || 'pending',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
};

export const submitRequest = async (type: EmployeeRequest['type'], reason: string): Promise<string> => {
  if (!auth?.currentUser || !db) throw new Error('User not authenticated');
  const storeId = await getWorkforceStoreId();
  const ref = await addDoc(collection(db, 'requests'), {
    employeeId: auth.currentUser.uid,
    employeeName: auth.currentUser.displayName || auth.currentUser.email || 'Employee',
    storeId,
    type,
    reason: reason.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getMyRequests = async (): Promise<EmployeeRequest[]> => {
  if (!auth?.currentUser || !db) return [];
  const q = query(
    collection(db, 'requests'),
    where('employeeId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapRequest);
};

export const getAllRequests = async (): Promise<EmployeeRequest[]> => {
  if (!db) return [];
  const firestore = db;
  const storeId = await getCurrentStoreId();
  if (!storeId) return [];

  const sortNewest = (items: EmployeeRequest[]) =>
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const fetchByStoreId = async (): Promise<EmployeeRequest[]> => {
    try {
      const q = query(
        collection(firestore, 'requests'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapRequest);
    } catch (error: any) {
      if (error?.code !== 'failed-precondition') {
        throw error;
      }
      const fallback = query(collection(firestore, 'requests'), where('storeId', '==', storeId));
      const snap = await getDocs(fallback);
      return sortNewest(snap.docs.map(mapRequest));
    }
  };

  const storeRequests = await fetchByStoreId();
  const seen = new Set(storeRequests.map((r) => r.id));

  try {
    const teamUsers = await getTeamUsers();
    const chunks: string[][] = [];
    for (let i = 0; i < teamUsers.length; i += 10) {
      chunks.push(teamUsers.slice(i, i + 10).map((u) => u.uid));
    }

    for (const employeeIds of chunks) {
      if (employeeIds.length === 0) continue;
      const teamQuery = query(
        collection(firestore, 'requests'),
        where('employeeId', 'in', employeeIds)
      );
      const snap = await getDocs(teamQuery);
      snap.docs.forEach((item) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        storeRequests.push(mapRequest(item));
      });
    }
  } catch {
    // Manager-only lookup; ignore when unavailable.
  }

  return sortNewest(storeRequests);
};

export const reviewRequest = async (requestId: string, status: 'approved' | 'rejected'): Promise<void> => {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
};
