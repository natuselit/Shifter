import { useEffect, useMemo, useState } from 'react';
import { ReportsPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
import { TimerPage } from '@/pages/timer';
import { BottomNav } from '@/widgets/bottom-nav';

const legacyRedirects: Record<string, string> = {
  '/history': '#/reports',
  '/salary': '#/analytics'
};

function normalizeHashPath(hash: string): string {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function useHashPath() {
  const [path, setPath] = useState(() => normalizeHashPath(window.location.hash));

  useEffect(() => {
    const update = () => setPath(normalizeHashPath(window.location.hash));
    window.addEventListener('hashchange', update);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return path;
}

export function AppRouter() {
  const path = useHashPath();
  const page = useMemo(() => {
    if (path in legacyRedirects) return null;
    if (path === '/reports') return <ReportsPage />;
    if (path === '/analytics') return <ReportsPage view="analytics" />;
    if (path === '/settings') return <SettingsPage />;
    return <TimerPage />;
  }, [path]);

  useEffect(() => {
    const redirectTo = legacyRedirects[path];
    if (redirectTo) {
      window.location.replace(redirectTo);
      return;
    }

    const titles: Record<string, string> = {
      '/': 'Зміна',
      '/history': 'Зміни',
      '/reports': 'Зміни',
      '/salary': 'Аналітика',
      '/analytics': 'Аналітика',
      '/settings': 'Налаштування'
    };
    document.title = titles[path] || 'Shifter';
  }, [path]);

  return (
    <>
      {page}
      <BottomNav currentPath={path} />
    </>
  );
}
