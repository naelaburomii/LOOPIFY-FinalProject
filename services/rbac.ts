import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { DEFAULT_ROLE, Permission, ROLE_PERMISSIONS, ROUTE_ACCESS, UserRole } from '../types/roles';
import { getSelectedDevBusinessId, isCurrentUserDeveloper } from './devMode';

export interface UserRoleProfile {
  role: UserRole;
  businessName?: string;
  uid?: string;
  storeId?: string;
  ownerBusinessId?: string;
  isTeamMember?: boolean;
  isDeveloper?: boolean;
}

export const getCurrentUserRoleProfile = async (): Promise<UserRoleProfile> => {
  if (!auth?.currentUser || !db) {
    return { role: DEFAULT_ROLE };
  }

  const selectedDevBusinessId = await getSelectedDevBusinessId();
  const profileBusinessId = selectedDevBusinessId || auth.currentUser.uid;
  const businessDoc = await getDoc(doc(db, 'businesses', profileBusinessId));
  if (!businessDoc.exists()) {
    return { role: DEFAULT_ROLE, isDeveloper: isCurrentUserDeveloper() };
  }

  const data = businessDoc.data();
  const role = isCurrentUserDeveloper() ? 'manager' : (data.role as UserRole) || DEFAULT_ROLE;
  return {
    role,
    uid: profileBusinessId,
    businessName: data.businessName,
    storeId: data.storeId || data.ownerBusinessId || profileBusinessId,
    ownerBusinessId: data.ownerBusinessId || profileBusinessId,
    isTeamMember: !!data.isTeamMember,
    isDeveloper: isCurrentUserDeveloper(),
  };
};

let businessIdCache: { uid: string; id: string; at: number } | null = null;
const BUSINESS_ID_CACHE_MS = 8000;

export const invalidateBusinessIdCache = (): void => {
  businessIdCache = null;
};

export const getCurrentBusinessId = async (): Promise<string | null> => {
  if (!auth?.currentUser) {
    return null;
  }

  const uid = auth.currentUser.uid;
  const now = Date.now();
  if (
    businessIdCache &&
    businessIdCache.uid === uid &&
    now - businessIdCache.at < BUSINESS_ID_CACHE_MS
  ) {
    return businessIdCache.id;
  }

  const selectedDevBusinessId = await getSelectedDevBusinessId();
  if (selectedDevBusinessId) {
    businessIdCache = { uid, id: selectedDevBusinessId, at: now };
    return selectedDevBusinessId;
  }

  const profile = await getCurrentUserRoleProfile();
  const resolved = profile.storeId || uid;
  businessIdCache = { uid, id: resolved, at: now };
  return resolved;
};

export const getCurrentStoreId = async (): Promise<string> => {
  const businessId = await getCurrentBusinessId();
  return businessId || auth?.currentUser?.uid || '';
};

/** Store id used for workforce docs (requests, attendance, shifts). */
export const getWorkforceStoreId = async (): Promise<string> => {
  const profile = await getCurrentUserRoleProfile();
  if (profile.isTeamMember && profile.ownerBusinessId) {
    return profile.ownerBusinessId;
  }
  return profile.storeId || profile.ownerBusinessId || auth?.currentUser?.uid || '';
};

/** True when the user can view and approve team member requests. */
export const canReviewTeamRequests = (profile: UserRoleProfile): boolean => {
  if (profile.isDeveloper) return true;
  if (profile.role === 'manager') return true;
  if (!profile.isTeamMember && profile.uid && profile.ownerBusinessId === profile.uid) {
    return true;
  }
  return false;
};

export const canPerformAction = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const allowedRoles = ROUTE_ACCESS[route];
  if (!allowedRoles) {
    return true;
  }
  return allowedRoles.includes(role);
};

export const getDefaultRouteForRole = (role: UserRole): string => {
  if (role === 'employee') {
    return '/(drawer)/attendance';
  }
  if (role === 'customer') {
    return '/(drawer)/browse-businesses';
  }
  return '/(drawer)/dashboard';
};
