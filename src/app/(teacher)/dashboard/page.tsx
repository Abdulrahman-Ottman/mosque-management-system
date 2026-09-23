import type { Metadata } from 'next';
import Link from 'next/link';

import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { BookOpenIcon } from '@/components/icons';
import { TodaySchedule, type ScheduleItem } from '@/components/TodaySchedule';
import {
  Avatar,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  Flash,
  Page,
  PageHeader,
  buttonClass,
} from '@/components/ui';
import { deleteStudent } from '@/actions/students';
import { dayOfWeekIn } from '@/lib/arabic-date';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'الرئيسية' };

type StudentRow = {
  id: number;
  name: string;
  grade: string | null;
  points: number;
  parent: { name: string } | null;
};

export default async function TeacherDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireRole('teacher');
  const { saved } = await searchParams;
  const supabase = await createClient();

  // RLS restricts this to the signed-in teacher's own students; the explicit
  // user_id filter keeps the intent visible and lets the index do its job.
  const [{ data: students }, { data: schedule }] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, grade, points, parent:users!students_parent_id_fkey(name)')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('schedule_items')
      .select('id, content, sort_order')
      .eq('day_of_week', dayOfWeekIn())
      .order('sort_order'),
  ]);

  const rows = (students ?? []) as unknown as StudentRow[];

  return (
    <Page>
      {saved ? <Flash>تم حفظ الحضور بنجاح</Flash> : null}

      <PageHeader
        title={`أهلاً، ${user.name}`}
        subtitle={`لديك ${rows.length} من الطلاب`}
        actions={
          <>
            <ButtonLink href="/attendance" variant="primary" size="sm">
              تسجيل الحضور
            </ButtonLink>
            <ButtonLink href="/students/new" variant="secondary" size="sm">
              إضافة طالب
            </ButtonLink>
          </>
        }
      />

      <TodaySchedule items={(schedule ?? []) as ScheduleItem[]} />

      {rows.length === 0 ? (
        <EmptyState icon={<BookOpenIcon />}>
          لا يوجد طلاب بعد. ابدأ بإضافة طالب جديد.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {rows.map((student) => (
            <Card as="li" key={student.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={student.name} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[length:var(--text-base)] font-extrabold text-ink">
                    {student.name}
                  </p>
                  <p className="m-0 truncate text-[length:var(--text-xs)] text-ink-muted">
                    {student.grade || 'بدون صف'}
                    {student.parent?.name ? ` · ${student.parent.name}` : ' · بدون ولي أمر'}
                  </p>
                </div>
                <Chip tone="gold">{student.points} نقطة</Chip>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/students/${student.id}/follow`}
                  className={buttonClass('primary', { size: 'sm', className: 'flex-1' })}
                >
                  المتابعة
                </Link>
                <Link
                  href={`/students/${student.id}/edit`}
                  className={buttonClass('secondary', { size: 'sm' })}
                >
                  تعديل
                </Link>
                <form action={deleteStudent}>
                  <input type="hidden" name="id" value={student.id} />
                  <ConfirmSubmit
                    message={`هل أنت متأكد من حذف الطالب ${student.name}؟`}
                    variant="danger"
                    size="sm"
                  >
                    حذف
                  </ConfirmSubmit>
                </form>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </Page>
  );
}
