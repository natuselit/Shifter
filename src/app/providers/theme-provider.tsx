import { useEffect, type ReactNode } from 'react';
import { useSnapshot } from '@/entities/app-state';
import { getAccentColorPreset } from '@/entities/settings';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSnapshot();

  useEffect(() => {
    const preset = getAccentColorPreset(settings.accentColor);
    const root = document.documentElement;

    root.style.setProperty('--primary', preset.primary);
    root.style.setProperty('--primary-strong', preset.primaryStrong);
    root.style.setProperty('--tile', preset.tile);
    root.style.setProperty('accent-color', preset.primary);
  }, [settings.accentColor]);

  return children;
}
