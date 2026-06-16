import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeStoredData, storage } from '../../shared/storage/local-storage';

interface StoreContextValue {
  version: number;
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    normalizeStoredData();
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ version, refresh }), [version, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}

export function useSnapshot() {
  const { version, refresh } = useStore();

  return {
    version,
    refresh,
    settings: storage.settings,
    shifts: storage.shifts,
    startedAt: storage.startedAt,
    activeRate: storage.activeRate,
    rateMultiplier: storage.rateMultiplier
  };
}
