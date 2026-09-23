'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  CalendarIcon,
  ChartIcon,
  TargetIcon,
  TeacherIcon,
  UsersIcon,
} from '@/components/icons';
import { cx } from '@/components/ui';

/** Port of resources/views/partials/admin-tabs.blade.php. */
const TABS = [
  { href: '/admin/dashboard', label: 'الإحصائيات', Icon: ChartIcon },
  { href: '/admin/teachers', label: 'الأساتذة', Icon: TeacherIcon },
  { href: '/admin/parents', label: 'أولياء الأمور', Icon: UsersIcon },
  { href: '/admin/activities', label: 'النشاطات', Icon: TargetIcon },
  { href: '/admin/schedule', label: 'الجدول', Icon: CalendarIcon },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-surface">
      <nav className="no-scrollbar mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-4 py-2">
        {TABS.map((tab) => {
          // The Blade version only highlighted index pages; here a nested page such
          // as /admin/teachers/new keeps its tab lit, which reads better.
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cx(
                'flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-[length:var(--text-sm)] font-bold no-underline transition-colors',
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-muted hover:bg-paper hover:text-ink',
              )}
            >
              <tab.Icon className="size-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
