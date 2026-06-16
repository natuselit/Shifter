import type { ReactNode } from 'react';
import { ConfirmProvider } from '../../shared/ui/confirm-provider';
import { NotificationProvider } from './notification-provider';
import { StoreProvider } from './store-provider';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from '../../widgets/toast/toast-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ToastProvider>
          <NotificationProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </NotificationProvider>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}
