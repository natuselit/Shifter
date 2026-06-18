import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeStoredData, storage } from './storage';

interface StoreContextValue {
  version: number;
  refresh: () => void;
  settings: typeof storage.settings;
  shifts: typeof storage.shifts;
  startedAt: number | null;
  activeRate: number | null;
  rateMultiplier: typeof storage.rateMultiplier;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    normalizeStoredData();
    refresh();
  }, [refresh]);

  const snapshot = useMemo(
    () => ({
      version,
      settings: storage.settings,
      shifts: storage.shifts,
      startedAt: storage.startedAt,
      activeRate: storage.activeRate,
      rateMultiplier: storage.rateMultiplier
    }),
    [version]
  );
  const value = useMemo(() => ({ refresh, ...snapshot }), [refresh, snapshot]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}

export function useSnapshot() {
  return useStore();
}
