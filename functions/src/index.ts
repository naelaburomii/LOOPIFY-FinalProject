import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

const db = admin.firestore();

const DEVELOPER_EMAILS = new Set([
  'nael@loopify.dev',
  'naelamem@gmail.com',
  'naelaburomii@gmail.com',
]);

const isDeveloperEmail = (email?: string | null): boolean => {
  return !!email && DEVELOPER_EMAILS.has(email.trim().toLowerCase());
};

const assertCanManageCatalog = async (uid: string, email?: string | null): Promise<void> => {
  if (isDeveloperEmail(email)) {
    return;
  }

  const userDoc = await db.doc(`businesses/${uid}`).get();
  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'Business profile was not found.');
  }

  const data = userDoc.data() || {};
  const role = String(data.role || '').toLowerCase();
  const isLegacyOwner =
    data.isTeamMember !== true &&
    (!data.ownerBusinessId || data.ownerBusinessId === uid);

  if (role === 'manager' || role === 'supplier' || isLegacyOwner) {
    return;
  }

  throw new HttpsError('permission-denied', 'Only managers and suppliers can manage inventory.');
};

const getManagedBusinessIds = async (uid: string): Promise<Set<string>> => {
  const ids = new Set<string>([uid]);
  const userDoc = await db.doc(`businesses/${uid}`).get();
  if (!userDoc.exists) {
    return ids;
  }

  const data = userDoc.data() || {};
  if (data.storeId) {
    ids.add(String(data.storeId));
  }
  if (data.ownerBusinessId) {
    ids.add(String(data.ownerBusinessId));
  }

  return ids;
};

export const deleteCatalogItemAdmin = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const itemType = String(request.data?.itemType || '').trim();
    const itemId = String(request.data?.itemId || '').trim();
    const requestedBusinessId = String(request.data?.businessId || '').trim();

    if (!['product', 'category'].includes(itemType)) {
      throw new HttpsError('invalid-argument', 'itemType must be product or category.');
    }
    if (!itemId) {
      throw new HttpsError('invalid-argument', 'itemId is required.');
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email ?? null;

    await assertCanManageCatalog(uid, email);

    const collection = itemType === 'category' ? 'productCategories' : 'products';
    const itemRef = db.doc(`${collection}/${itemId}`);
    const itemSnap = await itemRef.get();

    if (!itemSnap.exists) {
      throw new HttpsError('not-found', 'Inventory item was not found.');
    }

    const itemBusinessId = String(itemSnap.data()?.businessId || '');
    if (!itemBusinessId) {
      throw new HttpsError('failed-precondition', 'Inventory item is missing businessId.');
    }

    if (isDeveloperEmail(email)) {
      if (requestedBusinessId && itemBusinessId !== requestedBusinessId) {
        throw new HttpsError('permission-denied', 'Item does not belong to the selected business.');
      }
    } else {
      const allowedBusinessIds = await getManagedBusinessIds(uid);
      if (!allowedBusinessIds.has(itemBusinessId)) {
        throw new HttpsError('permission-denied', 'You can only delete your own inventory items.');
      }
    }

    await itemRef.delete();
    return { success: true };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('deleteCatalogItemAdmin failed:', error);
    throw new HttpsError('internal', error?.message || 'Failed to delete inventory item.');
  }
});

const assertManagerOwnsTeamUser = async (managerId: string, teamUserId: string) => {
  const managerDoc = await db.doc(`businesses/${managerId}`).get();
  if (!managerDoc.exists) {
    throw new HttpsError('permission-denied', 'Manager profile was not found.');
  }

  const manager = managerDoc.data() || {};
  const managerRole = (manager.role || 'manager').toString().toLowerCase();
  const isLegacyOwner =
    manager.isTeamMember !== true &&
    (!manager.ownerBusinessId || manager.ownerBusinessId === managerId);

  if (managerRole !== 'manager' && !isLegacyOwner) {
    throw new HttpsError('permission-denied', 'Only managers can update team users.');
  }

  const teamDoc = await db.doc(`businesses/${teamUserId}`).get();
  if (!teamDoc.exists) {
    throw new HttpsError('not-found', 'Team user profile was not found.');
  }

  const teamUser = teamDoc.data() || {};
  if (teamUser.ownerBusinessId !== managerId || teamUser.isTeamMember !== true) {
    throw new HttpsError('permission-denied', 'This team user does not belong to your store.');
  }
};

export const updateTeamUserAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in as a manager.');
  }

  const teamUserId = String(request.data?.uid || '').trim();
  const displayName = String(request.data?.displayName || '').trim();
  const phoneNumber = String(request.data?.phoneNumber || '').trim();
  const email = String(request.data?.email || '').trim().toLowerCase();
  const role = String(request.data?.role || '').trim().toLowerCase();
  const password = String(request.data?.password || '').trim();

  const hourlySalary = Number(request.data?.hourlySalary);
  const hasHourlySalary = request.data?.hourlySalary !== undefined && request.data?.hourlySalary !== null && request.data?.hourlySalary !== '';

  if (!teamUserId) {
    throw new HttpsError('invalid-argument', 'Missing team user id.');
  }

  if (!displayName) {
    throw new HttpsError('invalid-argument', 'Name is required.');
  }

  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Valid login email is required.');
  }

  if (!['employee', 'supplier'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Role must be employee or supplier.');
  }

  if (password && password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  await assertManagerOwnsTeamUser(request.auth.uid, teamUserId);

  try {
    await admin.auth().updateUser(teamUserId, {
      displayName,
      email,
      ...(password ? { password } : {}),
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'This login email is already used by another account.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'The login email is invalid.');
    }
    throw new HttpsError('internal', error.message || 'Failed to update Firebase login.');
  }

  await db.doc(`businesses/${teamUserId}`).update({
    displayName,
    businessName: displayName,
    phoneNumber,
    email,
    role,
    ...(hasHourlySalary ? { hourlySalary: Math.max(0, hourlySalary || 0) } : {}),
    ...(password
      ? {
          passwordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          passwordUpdatedBy: request.auth.uid,
        }
      : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid,
  });

  return { success: true };
});
