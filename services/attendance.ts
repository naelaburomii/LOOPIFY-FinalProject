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
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getCurrentStoreId, getWorkforceStoreId } from './rbac';
import { getTeamUsers } from './teamUsers';
import {
  calculateEntryHours,
  getMonthlyBreakdown,
  getMonthlyHoursForEntries,
} from '../utils/attendanceHours';

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId?: string;
  clockInAt: Date;
  clockOutAt?: Date;
  status: 'clocked_in' | 'clocked_out' | 'approved';
  notes?: string;
}

export interface WorkerAttendanceSummary {
  employeeId: string;
  employeeName: string;
  email: string;
  hourlySalary: number;
  currentMonthHours: number;
  currentMonthSalary: number;
  entries: AttendanceEntry[];
  monthlyBreakdown: ReturnType<typeof getMonthlyBreakdown>;
}

const mapAttendance = (item: { id: string; data: () => Record<string, any> }): AttendanceEntry => {
  const data = item.data();
  return {
    id: item.id,
    employeeId: data.employeeId,
    employeeName: data.employeeName || 'Employee',
    storeId: data.storeId,
    clockInAt: data.clockInAt?.toDate?.() || new Date(data.clockInAt),
    clockOutAt: data.clockOutAt?.toDate?.() || undefined,
    status: data.status || 'clocked_in',
    notes: data.notes || '',
  };
};

export const clockIn = async (): Promise<string> => {
  if (!auth?.currentUser || !db) throw new Error('User not authenticated');
  const storeId = await getWorkforceStoreId();
  const ref = await addDoc(collection(db, 'attendance'), {
    employeeId: auth.currentUser.uid,
    employeeName: auth.currentUser.displayName || auth.currentUser.email || 'Employee',
    storeId,
    clockInAt: serverTimestamp(),
    status: 'clocked_in',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const clockOut = async (entryId: string): Promise<void> => {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'attendance', entryId), {
    clockOutAt: serverTimestamp(),
    status: 'clocked_out',
    updatedAt: serverTimestamp(),
  });
};

export const approveAttendance = async (entryId: string): Promise<void> => {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'attendance', entryId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
};

export const getEmployeeAttendance = async (employeeId: string): Promise<AttendanceEntry[]> => {
  if (!db) return [];
  const firestore = db;
  try {
    const q = query(
      collection(firestore, 'attendance'),
      where('employeeId', '==', employeeId),
      orderBy('clockInAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapAttendance);
  } catch (error: any) {
    if (error?.code !== 'failed-precondition') throw error;
    const fallback = query(collection(firestore, 'attendance'), where('employeeId', '==', employeeId));
    const snap = await getDocs(fallback);
    return snap.docs
      .map(mapAttendance)
      .sort((a, b) => b.clockInAt.getTime() - a.clockInAt.getTime());
  }
};

export const getMyAttendance = async (): Promise<AttendanceEntry[]> => {
  if (!auth?.currentUser) return [];
  return getEmployeeAttendance(auth.currentUser.uid);
};

export const getStoreAttendance = async (): Promise<AttendanceEntry[]> => {
  if (!db) return [];
  const firestore = db;
  const storeId = await getCurrentStoreId();
  if (!storeId) return [];

  const sortNewest = (items: AttendanceEntry[]) =>
    items.sort((a, b) => b.clockInAt.getTime() - a.clockInAt.getTime());

  const fetchByStore = async (): Promise<AttendanceEntry[]> => {
    try {
      const q = query(
        collection(firestore, 'attendance'),
        where('storeId', '==', storeId),
        orderBy('clockInAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapAttendance);
    } catch (error: any) {
      if (error?.code !== 'failed-precondition') throw error;
      const fallback = query(collection(firestore, 'attendance'), where('storeId', '==', storeId));
      const snap = await getDocs(fallback);
      return sortNewest(snap.docs.map(mapAttendance));
    }
  };

  const byStore = await fetchByStore();
  const seen = new Set(byStore.map((entry) => entry.id));

  try {
    const teamUsers = await getTeamUsers();
    const employeeIds = teamUsers.filter((u) => u.role === 'employee').map((u) => u.uid);
    for (let i = 0; i < employeeIds.length; i += 10) {
      const chunk = employeeIds.slice(i, i + 10);
      if (chunk.length === 0) continue;
      const teamQuery = query(collection(firestore, 'attendance'), where('employeeId', 'in', chunk));
      const snap = await getDocs(teamQuery);
      snap.docs.forEach((item) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        byStore.push(mapAttendance(item));
      });
    }
  } catch {
    // Manager-only enrichment.
  }

  return sortNewest(byStore);
};

export const getMonthlySummaryHours = async (): Promise<number> => {
  const entries = await getMyAttendance();
  const current = new Date();
  return getMonthlyHoursForEntries(entries, current.getMonth(), current.getFullYear());
};

/** Total clocked hours for all workers in the store this month (manager dashboard). */
export const getStoreMonthlySummaryHours = async (): Promise<number> => {
  const entries = await getStoreAttendance();
  const current = new Date();
  return getMonthlyHoursForEntries(entries, current.getMonth(), current.getFullYear());
};

export const buildWorkerAttendanceSummaries = async (): Promise<WorkerAttendanceSummary[]> => {
  const [teamUsers, storeAttendance] = await Promise.all([getTeamUsers(), getStoreAttendance()]);
  const employees = teamUsers.filter((user) => user.role === 'employee');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return employees.map((employee) => {
    const entries = storeAttendance.filter((entry) => entry.employeeId === employee.uid);
    const hourlySalary = employee.hourlySalary || 0;
    const currentMonthHours = getMonthlyHoursForEntries(entries, currentMonth, currentYear);
    const monthlyBreakdown = getMonthlyBreakdown(entries);

    return {
      employeeId: employee.uid,
      employeeName: employee.displayName,
      email: employee.email,
      hourlySalary,
      currentMonthHours,
      currentMonthSalary: Math.round(currentMonthHours * hourlySalary * 100) / 100,
      entries,
      monthlyBreakdown,
    };
  });
};

export { calculateEntryHours, getMonthlyBreakdown, getMonthlyHoursForEntries };
