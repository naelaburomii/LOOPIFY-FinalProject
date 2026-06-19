import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const DEV_BUSINESS_KEY = 'loopify.dev.selectedBusinessId';
const DEFAULT_DEV_EMAILS = ['nael@loopify.dev', 'naelamem@gmail.com', 'naelaburomii@gmail.com'];

const getAllowedDeveloperEmails = (): string[] => {
  const configured = process.env.EXPO_PUBLIC_DEV_EMAILS;
  if (!configured) {
    return DEFAULT_DEV_EMAILS;
  }
  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const isDeveloperEmail = (email?: string | null): boolean => {
  if (!email) {
    return false;
  }
  return getAllowedDeveloperEmails().includes(email.trim().toLowerCase());
};

export const isCurrentUserDeveloper = (): boolean => {
  return isDeveloperEmail(auth?.currentUser?.email);
};

/** Keeps Firestore rules in sync when a developer impersonates a seeded store. */
export const syncDevActingBusinessToFirestore = async (
  businessId: string | null
): Promise<void> => {
  if (!auth?.currentUser || !db || !isCurrentUserDeveloper()) {
    return;
  }

  const profileRef = doc(db, 'businesses', auth.currentUser.uid);
  if (businessId) {
    await setDoc(
      profileRef,
      {
        devActingBusinessId: businessId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(
      profileRef,
      {
        devActingBusinessId: deleteField(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
};

export const setSelectedDevBusinessId = async (businessId: string): Promise<void> => {
  await AsyncStorage.setItem(DEV_BUSINESS_KEY, businessId);
  const { invalidateBusinessIdCache } = await import('./rbac');
  invalidateBusinessIdCache();
  await syncDevActingBusinessToFirestore(businessId);
};

export const getSelectedDevBusinessId = async (): Promise<string | null> => {
  if (!isCurrentUserDeveloper()) {
    return null;
  }

  const fromStorage = await AsyncStorage.getItem(DEV_BUSINESS_KEY);
  if (fromStorage) {
    syncDevActingBusinessToFirestore(fromStorage).catch((error) => {
      console.warn('Could not sync dev acting business to Firestore:', error);
    });
    return fromStorage;
  }

  if (auth?.currentUser && db) {
    try {
      const snap = await getDoc(doc(db, 'businesses', auth.currentUser.uid));
      const fromProfile = snap.data()?.devActingBusinessId as string | undefined;
      if (fromProfile) {
        await AsyncStorage.setItem(DEV_BUSINESS_KEY, fromProfile);
        return fromProfile;
      }
    } catch (error) {
      console.warn('Could not read dev acting business from Firestore:', error);
    }
  }

  return null;
};

export const clearSelectedDevBusinessId = async (): Promise<void> => {
  await AsyncStorage.removeItem(DEV_BUSINESS_KEY);
  const { invalidateBusinessIdCache } = await import('./rbac');
  invalidateBusinessIdCache();
  await syncDevActingBusinessToFirestore(null);
};

export const getSelectedDevBusinessName = async (): Promise<string | null> => {
  const businessId = await getSelectedDevBusinessId();
  if (!businessId || !db) {
    return null;
  }
  const snap = await getDoc(doc(db, 'businesses', businessId));
  return snap.exists() ? snap.data().businessName || snap.data().displayName || businessId : businessId;
};
