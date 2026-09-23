import type { Metadata } from 'next';
import Link from 'next/link';

import { Chip, Page, PageHeader, cx } from '@/components/ui';
import { dayName, dayOfWeekIn } from '@/lib/arabic-date';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'الجدول الأسبوعي' };

/**
 * Port of resources/views/admin/schedule/index.blade.php.
 * Days run Saturday -> Friday, matching the week used everywhere else in the app.
 */
const ORDERED_DAYS = [6, 0, 1, 2, 3, 4, 5];

export default async function SchedulePage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data: items } = await supabase.from('schedule_items').select('day_of_week');

  const counts = new Map<number, number>();
  for (const i of items ?? []) counts.set(i.day_of_week, (counts.get(i.day_of_week) ?? 0) + 1);

  const currentDay = dayOfWeekIn();

  return (
    <Page wide>
      <PageHeader title="الجدول الأسبوعي" subtitle="اختر يومًا لتحرير برنامجه" />

      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {ORDERED_DAYS.map((day) => {
          const count = counts.get(day) ?? 0;
          const isToday = day === currentDay;

          return (
            <li key={day}>
              <Link
                href={`/admin/schedule/${day}`}
                className={cx(
                  'flex items-center justify-between gap-3 rounded-[var(--radius)] border bg-surface p-4 no-underline shadow-[var(--shadow-xs)] transition-colors hover:border-accent',
                  isToday ? 'border-accent bg-accent-soft' : 'border-border',
                )}
              >
                <span>
                  <span className="block text-[length:var(--text-lg)] font-extrabold text-ink">
                    {dayName(day)}
                  </span>
                  <span className="block text-[length:var(--text-xs)] text-ink-muted">
                    {count === 0 ? 'لا يوجد برنامج' : `${count} قسم`}
                  </span>
                </span>
                {isToday ? <Chip tone="green">اليوم</Chip> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
