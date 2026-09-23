import type { Metadata } from 'next';
import Link from 'next/link';

import { deleteActivity } from '@/actions/activities';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { TargetIcon } from '@/components/icons';
import {
  ButtonLink,
  Card,
  EmptyState,
  Page,
  PageHeader,
  StatGrid,
  StatTile,
  buttonClass,
} from '@/components/ui';
import { labelForDateString, today } from '@/lib/arabic-date';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'النشاطات' };

/** Port of resources/views/admin/activities/index.blade.php. */
export default async function ActivitiesPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from('activities')
    .select('id, title, description, date, students_count')
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  const rows = activities ?? [];
  const totalParticipations = rows.reduce((sum, a) => sum + a.students_count, 0);
  const thisMonth = today().slice(0, 7);
  const thisMonthCount = rows.filter((a) => a.date.slice(0, 7) === thisMonth).length;

  return (
    <Page wide>
      <PageHeader
        title="نشاطات المسجد"
        actions={
          <ButtonLink href="/admin/activities/new" size="sm">
            إضافة نشاط
          </ButtonLink>
        }
      />

      <StatGrid>
        <StatTile label="النشاطات" value={rows.length} />
        <StatTile label="إجمالي المشاركات" value={totalParticipations} />
        <StatTile label="هذا الشهر" value={thisMonthCount} tone="gold" />
      </StatGrid>

      {rows.length === 0 ? (
        <EmptyState icon={<TargetIcon />}>لا توجد نشاطات بعد.</EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((a) => (
            <Card as="li" key={a.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="m-0 text-[length:var(--text-base)] font-extrabold text-ink">
                    {a.title}
                  </p>
                  <p className="m-0 text-[length:var(--text-xs)] text-ink-muted">
                    {labelForDateString(a.date)} · {a.students_count} مشارك
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/activities/${a.id}/edit`}
                    className={buttonClass('secondary', { size: 'sm' })}
                  >
                    تعديل
                  </Link>
                  <form action={deleteActivity}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmSubmit message={`هل أنت متأكد من حذف نشاط ${a.title}؟`}>
                      حذف
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
              {a.description ? (
                <p className="m-0 text-[length:var(--text-sm)] whitespace-pre-line text-ink-muted">
                  {a.description}
                </p>
              ) : null}
            </Card>
          ))}
        </ul>
      )}
    </Page>
  );
}
