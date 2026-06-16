import { BarChart3, Clock3, DollarSign, List, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '#/', label: 'Зміна', Icon: Clock3 },
  { href: '#/history', label: 'Історія', Icon: List },
  { href: '#/salary', label: 'Зарплата', Icon: DollarSign },
  { href: '#/analytics', label: 'Аналітика', Icon: BarChart3 },
  { href: '#/settings', label: 'Налаштування', Icon: Settings }
];

export function BottomNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="bottom-nav" aria-label="Головне меню">
      {navItems.map(({ href, label, Icon }) => {
        const itemPath = href.replace('#', '') || '/';
        const isActive = currentPath === itemPath;

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
          </a>
        );
      })}
    </nav>
  );
}
