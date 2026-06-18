import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeStoredData, readStorageSnapshot, type StorageSnapshot } from './storage';

interface StoreContextValue extends StorageSnapshot {
  version: number;
  refresh: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function isSameSnapshot(first: StorageSnapshot, second: StorageSnapshot): boolean {
  return (
    first.settings === second.settings &&
    first.shifts === second.shifts &&
    first.startedAt === second.startedAt &&
    first.activeRate === second.activeRate &&
    first.rateMultiplier === second.rateMultiplier
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => ({
    version: 0,
    ...readStorageSnapshot()
  }));

  const refresh = useCallback(() => {
    setSnapshot((current) => {
      const next = readStorageSnapshot();
      if (isSameSnapshot(current, next)) return current;
      return { version: current.version + 1, ...next };
    });
  }, []);

  useEffect(() => {
    normalizeStoredData();
    refresh();
  }, [refresh]);

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
