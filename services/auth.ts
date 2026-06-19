import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { DEFAULT_ROLE, UserRole } from '../types/roles';
import { clearSelectedDevBusinessId, isDeveloperEmail } from './devMode';
import { LOOPIFY_DEMO_EMAIL, seedDemoCatalogForBusinessId, DEMO_BUSINESS_NAME } from './demoSeed';

export const LOOPIFY_DEMO_PASSWORD = 'password';

if (!auth || !db) {
  console.warn('Firebase is not configured. Authentication features will not work.');
}

export interface BusinessUser {
  uid: string;
  email: string;
  displayName?: string;
  businessName?: string;
  businessType?: string;
  phoneNumber?: string;
  address?: string;
  role: UserRole;
  storeId?: string;
  ownerBusinessId?: string;
  isTeamMember?: boolean;
  createdAt: Date;
}

/** Ensures Firestore `businesses/{uid}` profile exists for the Loopify demo supplier. */
export async function ensureLoopifyDemoBusinessDocument(uid: string, email: string): Promise<void> {
  if (!db) return;
  const now = serverTimestamp();
  await setDoc(
    doc(db, 'businesses', uid),
    {
      uid,
      email,
      displayName: DEMO_BUSINESS_NAME,
      businessName: DEMO_BUSINESS_NAME,
      businessType: 'Wholesale & Distribution',
      phoneNumber: '+972-3-555-0100',
      address: '12 HaMasger Street, Tel Aviv',
      location: 'Tel Aviv, Israel',
      workHours: 'Sun–Thu 8:00–18:00, Fri 8:00–13:00',
      description:
        'Demo B2B supplier for Loopify testing: catalog browsing, cart, orders, inventory, low-stock alerts, and barcode/QR flows.',
      services:
        'Same-day dispatch in TLV metro • Net-30 for approved buyers • Dedicated account manager on orders over ₪5,000',
      role: 'manager' as UserRole,
      storeId: uid,
      ownerBusinessId: uid,
      isTeamMember: false,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
}

async function hydrateLoopifyDemoAccount(user: User): Promise<void> {
  if (!user.email || user.email.trim().toLowerCase() !== LOOPIFY_DEMO_EMAIL.toLowerCase()) return;
  await ensureLoopifyDemoBusinessDocument(user.uid, user.email);
  await seedDemoCatalogForBusinessId(user.uid, { skipIfExists: true });
}

/**
 * Sign in as demo@loopify.web with password "password", creating the Auth user + Firestore business + catalog on first run.
 */
export async function loginOrProvisionLoopifyDemo(): Promise<User> {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }
  const email = LOOPIFY_DEMO_EMAIL.trim().toLowerCase();
  const password = LOOPIFY_DEMO_PASSWORD;

  const finishDemoSetup = async (user: User): Promise<User> => {
    await hydrateLoopifyDemoAccount(user);
    return user;
  };

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return finishDemoSetup(cred.user);
  } catch (error: any) {
    const code = error?.code || '';
    const shouldTryCreate =
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials';

    if (!shouldTryCreate) {
      throw new Error(error.message || 'Demo login failed');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: DEMO_BUSINESS_NAME });
      await ensureLoopifyDemoBusinessDocument(cred.user.uid, cred.user.email!);
      await seedDemoCatalogForBusinessId(cred.user.uid, { skipIfExists: true });
      return cred.user;
    } catch (createError: any) {
      if (createError.code === 'auth/email-already-in-use') {
        throw new Error(
          'The demo account exists but the password is wrong. Reset it in Firebase Console or tap "Demo business — sign in or create".'
        );
      }
      if (createError.code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/password sign-up is disabled in Firebase. Enable it in Authentication → Sign-in method.'
        );
      }
      throw new Error(createError.message || 'Could not create the demo account');
    }
  }
}

export const registerBusiness = async (
  email: string,
  password: string,
  businessName: string,
  businessType?: string,
  phoneNumber?: string,
  address?: string,
  role: UserRole = DEFAULT_ROLE
): Promise<User> => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: businessName,
    });

    const businessData: BusinessUser = {
      uid: user.uid,
      email: user.email!,
      displayName: businessName,
      businessName,
      businessType: businessType || '',
      phoneNumber: phoneNumber || '',
      address: address || '',
      role,
      storeId: user.uid,
      ownerBusinessId: user.uid,
      isTeamMember: false,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'businesses', user.uid), businessData);

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const loginBusiness = async (email: string, password: string): Promise<User> => {
  if (!auth) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (
    normalizedEmail === LOOPIFY_DEMO_EMAIL.toLowerCase() &&
    normalizedPassword === LOOPIFY_DEMO_PASSWORD
  ) {
    return loginOrProvisionLoopifyDemo();
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
    const user = userCredential.user;

    if (user.email && !isDeveloperEmail(user.email)) {
      await clearSelectedDevBusinessId();
    }
    try {
      await hydrateLoopifyDemoAccount(user);
    } catch (e) {
      console.warn('Loopify demo catalog hydrate:', e);
    }
    return user;
  } catch (error: any) {
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Invalid email or password. Use the exact login email and password created by the manager.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please wait a few minutes or reset the password.');
    }
    throw new Error(error.message || 'Login failed');
  }
};

export const logoutBusiness = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }

  try {
    await clearSelectedDevBusinessId();
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

export const deleteAccount = async (user: User): Promise<void> => {
  if (!auth || !db) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials.');
  }

  try {
    const userId = user.uid;
    await deleteDoc(doc(db, 'businesses', userId));
    await deleteUser(user);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete account');
  }
};
