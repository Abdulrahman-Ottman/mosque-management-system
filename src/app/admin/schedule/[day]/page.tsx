import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AddScheduleItemForm } from '@/components/AddScheduleItemForm';
import { CalendarIcon } from '@/components/icons';
import { ScheduleItemRow, type ScheduleRow } from '@/components/ScheduleItemRow';
import { BackLink, EmptyState, Page, PageHeader, SectionCard } from '@/components/ui';
import { dayName } from '@/lib/arabic-date';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'برنامج اليوم' };

/** Port of resources/views/admin/schedule/show.blade.php. */
export default async function ScheduleDayPage({ params }: { params: Promise<{ day: string }> }) {
  await requireRole('admin');
  const { day: dayParam } = await params;
  const day = Number(dayParam);

  // The Laravel route constrained this with ->where('day', '[0-6]').
  if (!Number.isInteger(day) || day < 0 || day > 6) notFound();

  const supabase = await createClient();
  const { data: items } = await supabase
    .from('schedule_items')
    .select('id, content, sort_order')
    .eq('day_of_week', day)
    .order('sort_order');

  const rows = (items ?? []) as ScheduleRow[];

  return (
    <Page>
      <BackLink href="/admin/schedule" />
      <PageHeader title={`برنامج ${dayName(day)}`} subtitle={`${rows.length} قسم`} />

      <SectionCard title="أقسام البرنامج" count={rows.length}>
        {rows.length === 0 ? (
          <EmptyState icon={<CalendarIcon />}>لا يوجد برنامج محدّد لهذا اليوم بعد.</EmptyState>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((item, index) => (
              <ScheduleItemRow
                key={item.id}
                item={item}
                day={day}
                index={index}
                isFirst={index === 0}
                isLast={index === rows.length - 1}
              />
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="إضافة قسم جديد">
        <AddScheduleItemForm day={day} />
      </SectionCard>
    </Page>
  );
}
