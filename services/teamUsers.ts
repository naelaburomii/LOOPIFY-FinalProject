import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, deleteUser, getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, firebaseConfig, functions } from '../config/firebase';
import { UserRole } from '../types/roles';
import { getSelectedDevBusinessId, isCurrentUserDeveloper } from './devMode';

export type TeamUserRole = 'employee' | 'supplier';

export interface TeamUser {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: TeamUserRole;
  businessName: string;
  ownerBusinessId: string;
  storeId: string;
  hourlySalary?: number;
  status: 'active' | 'disabled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTeamUserInput {
  displayName: string;
  phoneNumber?: string;
  role: TeamUserRole;
  email?: string;
  password?: string;
  hourlySalary?: number;
}

export const generateTeamEmail = (name: string, storeName: string): string => {
  const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  return `${safeName}.${Date.now().toString().slice(-5)}@loopify.team`;
};

export const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = 'Lp!';
  for (let i = 0; i < 9; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
};

const requireManagerProfile = async () => {
  if (!auth?.currentUser || !db) {
    throw new Error('User not authenticated');
  }

  // Normal managers: business profile lives at businesses/{auth uid}.
  // Developer console: you act on businesses/{selected store id}, not your own Auth uid.
  const devSelectedId = await getSelectedDevBusinessId();
  const permissionDocId =
    isCurrentUserDeveloper() && devSelectedId ? devSelectedId : auth.currentUser.uid;

  const managerRef = doc(db, 'businesses', permissionDocId);
  const managerDoc = await getDoc(managerRef);
  if (!managerDoc.exists()) {
    throw new Error('Manager business profile was not found');
  }
  const managerData = managerDoc.data();
  const role = (managerData.role || 'manager').toString().toLowerCase();
  const isLegacyOwnerAccount =
    !managerData.isTeamMember &&
    (!managerData.ownerBusinessId || managerData.ownerBusinessId === permissionDocId);
  const isManagerRole = role === 'manager' || isLegacyOwnerAccount;

  if (!isManagerRole) {
    throw new Error('Only managers can manage team logins');
  }

  const managerStoreRootId =
    managerData.ownerBusinessId || managerData.storeId || permissionDocId;

  return {
    managerId: managerStoreRootId,
    managerEmail: auth.currentUser.email || '',
    businessName: managerData.businessName || 'My Business',
    businessType: managerData.businessType || '',
    address: managerData.address || '',
  };
};

export const createTeamUser = async (input: CreateTeamUserInput): Promise<{ user: TeamUser; password: string }> => {
  if (!db) {
    throw new Error('Database is not configured');
  }
  const manager = await requireManagerProfile();
  const email = (input.email || generateTeamEmail(input.displayName, manager.businessName)).trim().toLowerCase();
  const password = (input.password || generateTemporaryPassword()).trim();
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  let secondaryApp: FirebaseApp | undefined;
  try {
    secondaryApp = initializeApp(firebaseConfig, `team-user-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const credentials = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(credentials.user, { displayName: input.displayName.trim() });
    const secondaryDb = getFirestore(secondaryApp);

    const teamUser: TeamUser = {
      uid: credentials.user.uid,
      email,
      displayName: input.displayName.trim(),
      phoneNumber: input.phoneNumber?.trim() || '',
      role: input.role,
      businessName: manager.businessName,
      ownerBusinessId: manager.managerId,
      storeId: manager.managerId,
      hourlySalary: Math.max(0, Number(input.hourlySalary) || 0),
      status: 'active',
    };

    try {
      await setDoc(doc(secondaryDb, 'businesses', credentials.user.uid), {
        ...teamUser,
        businessType: manager.businessType,
        address: manager.address,
        isTeamMember: true,
        createdBy: auth?.currentUser?.uid ?? manager.managerId,
        createdByEmail: manager.managerEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      await deleteUser(credentials.user).catch(() => undefined);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        throw new Error('Permission denied while saving the team profile. Deploy the updated Firestore rules, then try again.');
      }
      throw error;
    }

    await signOut(secondaryAuth);
    await signInWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);

    return { user: teamUser, password };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This login email is already used. Generate or enter a different email.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('The login email is invalid. Please enter a valid email address.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Use at least 6 characters.');
    }
    throw new Error(error.message || 'Failed to create team login');
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp).catch(() => undefined);
    }
  }
};

export const getTeamUsers = async (): Promise<TeamUser[]> => {
  const manager = await requireManagerProfile();
  if (!db) return [];

  const mapTeamUser = (item: any): TeamUser => {
    const data = item.data();
    return {
      uid: item.id,
      email: data.email || '',
      displayName: data.displayName || '',
      phoneNumber: data.phoneNumber || '',
      role: data.role || 'employee',
      businessName: data.businessName || manager.businessName,
      ownerBusinessId: data.ownerBusinessId || manager.managerId,
      storeId: data.storeId || manager.managerId,
      hourlySalary: typeof data.hourlySalary === 'number' ? data.hourlySalary : Number(data.hourlySalary) || 0,
      status: data.status || 'active',
      createdAt: data.createdAt?.toDate?.(),
      updatedAt: data.updatedAt?.toDate?.(),
    } as TeamUser;
  };

  try {
    const q = query(
      collection(db, 'businesses'),
      where('ownerBusinessId', '==', manager.managerId),
      where('isTeamMember', '==', true),
      orderBy('displayName')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapTeamUser);
  } catch (error: any) {
    if (error.code !== 'failed-precondition') {
      throw error;
    }

    // Fallback keeps the screen usable until the composite index is created.
    const fallbackQuery = query(
      collection(db, 'businesses'),
      where('ownerBusinessId', '==', manager.managerId)
    );
    const snap = await getDocs(fallbackQuery);
    return snap.docs
      .filter((item) => item.data().isTeamMember === true)
      .map(mapTeamUser)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
};

export const updateTeamUser = async (
  uid: string,
  updates: Partial<Pick<TeamUser, 'displayName' | 'phoneNumber' | 'role' | 'email' | 'status'>> & {
    password?: string;
  }
): Promise<void> => {
  if (!functions) {
    throw new Error('Firebase Functions is not configured');
  }
  const callable = httpsCallable(functions, 'updateTeamUserAdmin');
  await callable({
    uid,
    displayName: updates.displayName,
    phoneNumber: updates.phoneNumber || '',
    email: updates.email,
    role: updates.role,
    password: updates.password || '',
  });
};

export const updateTeamUserHourlySalary = async (uid: string, hourlySalary: number): Promise<void> => {
  if (!db) throw new Error('Database is not configured');
  await requireManagerProfile();
  await updateDoc(doc(db, 'businesses', uid), {
    hourlySalary: Math.max(0, Number(hourlySalary) || 0),
    updatedAt: serverTimestamp(),
  });
};

export const sendTeamUserPasswordReset = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
  }
  await sendPasswordResetEmail(auth, email);
};
