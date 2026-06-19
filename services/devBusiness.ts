import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentReference,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isCurrentUserDeveloper } from './devMode';

export interface DeleteBusinessResult {
  businessId: string;
  productsDeleted: number;
  categoriesDeleted: number;
  teamProfilesDeleted: number;
}

async function deleteDocsInBatches(refs: DocumentReference<DocumentData>[]): Promise<number> {
  if (!db || refs.length === 0) return 0;
  const firestore = db;
  let deleted = 0;
  let batch = writeBatch(firestore);
  let batchCount = 0;

  for (const ref of refs) {
    batch.delete(ref);
    batchCount += 1;
    deleted += 1;
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(firestore);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deleted;
}

/**
 * Developer-only: removes a business profile and its catalog (products + categories).
 * Team member profiles linked to this store are also removed from Firestore.
 */
export async function deleteBusinessCompletely(businessId: string): Promise<DeleteBusinessResult> {
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  if (!isCurrentUserDeveloper()) {
    throw new Error('Only developer accounts can delete businesses from the dev console.');
  }
  if (!businessId.trim()) {
    throw new Error('Business id is required.');
  }

  const firestore = db;
  const businessRef = doc(firestore, 'businesses', businessId);

  const [productSnap, categorySnap, teamSnap] = await Promise.all([
    getDocs(query(collection(firestore, 'products'), where('businessId', '==', businessId))),
    getDocs(query(collection(firestore, 'productCategories'), where('businessId', '==', businessId))),
    getDocs(query(collection(firestore, 'businesses'), where('ownerBusinessId', '==', businessId))).catch(
      async () => {
        const all = await getDocs(collection(firestore, 'businesses'));
        return {
          docs: all.docs.filter((item) => item.data().ownerBusinessId === businessId),
        } as Awaited<ReturnType<typeof getDocs>>;
      }
    ),
  ]);

  const productRefs = productSnap.docs.map((item) => item.ref);
  const categoryRefs = categorySnap.docs.map((item) => item.ref);
  const teamRefs = teamSnap.docs
    .filter((item) => {
      const data = item.data() as DocumentData;
      return item.id !== businessId && data.isTeamMember === true;
    })
    .map((item) => item.ref as DocumentReference<DocumentData>);

  const [productsDeleted, categoriesDeleted, teamProfilesDeleted] = await Promise.all([
    deleteDocsInBatches(productRefs as DocumentReference<DocumentData>[]),
    deleteDocsInBatches(categoryRefs as DocumentReference<DocumentData>[]),
    deleteDocsInBatches(teamRefs),
  ]);

  await deleteDoc(businessRef);

  return {
    businessId,
    productsDeleted,
    categoriesDeleted,
    teamProfilesDeleted,
  };
}
