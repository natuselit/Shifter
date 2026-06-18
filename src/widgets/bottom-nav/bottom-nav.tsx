import { ChartNoAxesCombined, Clock3, History, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  Icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '#/', label: 'Зміна', Icon: Clock3 },
  { href: '#/reports', label: 'Зміни', Icon: History },
  { href: '#/analytics', label: 'Аналітика', shortLabel: 'Аналіт.', Icon: ChartNoAxesCombined },
  { href: '#/settings', label: 'Налаштування', shortLabel: 'Налашт.', Icon: Settings }
];

export function BottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="bottom-nav" aria-label="Головне меню">
      {navItems.map(({ href, label, shortLabel, Icon }) => {
        const itemPath = href.replace('#', '') || '/';
        const isReportsAlias = itemPath === '/reports' && currentPath === '/history';
        const isActive = currentPath === itemPath || isReportsAlias;

        return (
          <a
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className={isActive ? 'active' : undefined}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={24} strokeWidth={2} />
            <span className={`nav-label nav-label-full ${shortLabel ? 'has-short-label' : ''}`}>{label}</span>
            {shortLabel && (
              <span className="nav-label nav-label-short" aria-hidden="true">
                {shortLabel}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
