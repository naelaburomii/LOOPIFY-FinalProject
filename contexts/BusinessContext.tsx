import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getCurrentBusinessId } from '../services/rbac';
import { setSelectedDevBusinessId as persistDevBusinessId } from '../services/devMode';

interface BusinessContextValue {
  businessId: string | null;
  businessReady: boolean;
  refreshBusinessId: () => Promise<string | null>;
  selectDevBusiness: (id: string) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessContextProvider({ children }: { children: ReactNode }) {
  const [businessId, setBusinessId] = useState<string | null>(auth?.currentUser?.uid ?? null);
  const [businessReady, setBusinessReady] = useState(false);

  const refreshBusinessId = useCallback(async () => {
    if (!auth?.currentUser) {
      setBusinessId(null);
      setBusinessReady(true);
      return null;
    }

    const id = await getCurrentBusinessId();
    const resolved = id || auth.currentUser.uid;
    setBusinessId(resolved);
    setBusinessReady(true);
    return resolved;
  }, []);

  const selectDevBusiness = useCallback(async (id: string) => {
    await persistDevBusinessId(id);
    setBusinessId(id);
    setBusinessReady(true);
  }, []);

  useEffect(() => {
    if (!auth) {
      setBusinessReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setBusinessId(null);
        setBusinessReady(true);
        return;
      }
      setBusinessId(user.uid);
      setBusinessReady(false);
      refreshBusinessId();
    });

    return () => unsub();
  }, [refreshBusinessId]);

  const value = useMemo(
    () => ({ businessId, businessReady, refreshBusinessId, selectDevBusiness }),
    [businessId, businessReady, refreshBusinessId, selectDevBusiness]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusinessContext must be used within BusinessContextProvider');
  }
  return ctx;
}

export function useOptionalBusinessId(): string | null {
  const ctx = useContext(BusinessContext);
  return ctx?.businessId ?? auth?.currentUser?.uid ?? null;
}
