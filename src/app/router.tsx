import { useEffect, useMemo, useState } from 'react';
import { AnalyticsPage } from '../pages/analytics/analytics-page';
import { HistoryPage } from '../pages/history/history-page';
import { SalaryPage } from '../pages/salary/salary-page';
import { SettingsPage } from '../pages/settings/settings-page';
import { TimerPage } from '../pages/timer/timer-page';
import { BottomNav } from '../widgets/bottom-nav/bottom-nav';

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
    if (path === '/history') return <HistoryPage />;
    if (path === '/salary') return <SalaryPage />;
    if (path === '/analytics') return <AnalyticsPage />;
    if (path === '/settings') return <SettingsPage />;
    return <TimerPage />;
  }, [path]);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Зміна',
      '/history': 'Історія',
      '/salary': 'Зарплата',
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
