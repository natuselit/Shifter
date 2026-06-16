import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ConfirmRequest {
  message: string;
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirmAction: (message: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirmAction = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirmAction }), [confirmAction]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && close(false)}>
          <div className="confirm-modal">
            <p>{request.message}</p>
            <div className="edit-actions">
              <button className="small-action" type="button" onClick={() => close(false)}>
                Скасувати
              </button>
              <button className="small-action danger-action" type="button" onClick={() => close(true)}>
                Підтвердити
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}
