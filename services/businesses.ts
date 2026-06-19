import { collection, query, getDocs, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BusinessProfile } from './profile';

export interface BusinessFilter {
  category?: string;
  businessType?: string;
  location?: string;
  searchQuery?: string;
}

export const getBusinesses = async (
  filters?: BusinessFilter,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<BusinessProfile[]> => {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  try {
    let q = query(collection(db, 'businesses'));

    // Apply filters
    if (filters?.category) {
      q = query(q, where('businessType', '==', filters.category));
    }
    if (filters?.businessType && !filters?.category) {
      q = query(q, where('businessType', '==', filters.businessType));
    }
    if (filters?.location) {
      q = query(q, where('location', '==', filters.location));
    }

    // Only order by if we don't have filters that require composite indexes
    // If we have filters, we'll sort client-side
    const hasFilters = filters?.category || filters?.businessType || filters?.location;
    if (!hasFilters) {
      try {
        q = query(q, orderBy('businessName'));
      } catch (error) {
        // If index doesn't exist, continue without ordering
        console.warn('Could not order by businessName, sorting client-side');
      }
    }

    // Pagination
    if (lastDoc && !hasFilters) {
      try {
        q = query(q, startAfter(lastDoc));
      } catch (error) {
        // If pagination fails, continue without it
        console.warn('Could not paginate, fetching all results');
      }
    }
    q = query(q, limit(50)); // Increased limit since we might sort client-side

    const querySnapshot = await getDocs(q);
    let businesses: BusinessProfile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      businesses.push({
        uid: doc.id,
        email: data.email || '',
        businessName: data.businessName || '',
        businessType: data.businessType || '',
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        role: data.role || 'manager',
        storeId: data.storeId || doc.id,
        ownerBusinessId: data.ownerBusinessId || doc.id,
        isTeamMember: data.isTeamMember || false,
        location: data.location || '',
        workHours: data.workHours || '',
        description: data.description || '',
        services: data.services || '',
        logoUrl: data.logoUrl || '',
        coverImageUrl: data.coverImageUrl || '',
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      });
    });

    // Sort client-side if we have filters or if server-side ordering failed
    if (hasFilters || businesses.length > 0) {
      businesses.sort((a, b) => a.businessName.localeCompare(b.businessName));
    }

    // Client-side search filtering if searchQuery is provided
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      businesses = businesses.filter(
        (business) =>
          business.businessName.toLowerCase().includes(searchLower) ||
          business.businessType?.toLowerCase().includes(searchLower) ||
          business.location?.toLowerCase().includes(searchLower) ||
          business.description?.toLowerCase().includes(searchLower)
      );
    }

    return businesses;
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    throw new Error(error.message || 'Failed to fetch businesses');
  }
};

export const getBusinessCategories = async (): Promise<string[]> => {
  if (!db) {
    return [];
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'businesses'));
    const categories = new Set<string>();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.businessType) {
        categories.add(data.businessType);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getBusinessLocations = async (): Promise<string[]> => {
  if (!db) {
    return [];
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'businesses'));
    const locations = new Set<string>();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.location) {
        locations.add(data.location);
      }
    });

    return Array.from(locations).sort();
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
};

