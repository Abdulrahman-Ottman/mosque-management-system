'use client';

import { useState, type ReactNode } from 'react';

import { BookOpenIcon, RotateIcon, StarIcon } from '@/components/icons';
import { cx } from '@/components/ui';

export type TabKey = 'new' | 'review' | 'points';

const TABS = [
  { key: 'new' as const, label: 'الحفظ الجديد', Icon: BookOpenIcon },
  { key: 'review' as const, label: 'المراجعة الكبرى', Icon: RotateIcon },
  { key: 'points' as const, label: 'النقاط', Icon: StarIcon },
];

/**
 * Port of the showTab() logic in follow.blade.php. The original toggled an `active`
 * class on divs; here only the selected panel is mounted.
 */
export function FollowTabs({
  newTab,
  reviewTab,
  pointsTab,
}: {
  newTab: ReactNode;
  reviewTab: ReactNode;
  pointsTab: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>('new');

  const panels: Record<TabKey, ReactNode> = {
    new: newTab,
    review: reviewTab,
    points: pointsTab,
  };

  return (
    <>
      <div
        role="tablist"
        className="mb-4 grid grid-cols-3 gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-[var(--shadow-xs)]"
      >
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={cx(
                'flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-2.5 text-[length:var(--text-xs)] font-bold transition-colors sm:text-[length:var(--text-sm)]',
                selected
                  ? 'bg-accent text-white shadow-[var(--shadow-xs)]'
                  : 'bg-transparent text-ink-muted hover:bg-accent-soft hover:text-accent',
              )}
            >
              <tab.Icon className="size-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{panels[active]}</div>
    </>
  );
}
