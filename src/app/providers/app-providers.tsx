import type { ReactNode } from 'react';
import { StoreProvider } from '@/entities/app-state';
import { ConfirmProvider, ToastProvider } from '@/shared/ui';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  );
}
