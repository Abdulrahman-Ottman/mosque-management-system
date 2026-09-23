import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  TransferStudentsForm,
  type OtherTeacher,
  type TransferStudent,
} from '@/components/TransferStudentsForm';
import { BookIcon } from '@/components/icons';
import {
  Avatar,
  BackLink,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  Flash,
  Page,
  SectionCard,
} from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تفاصيل الأستاذ' };

/** Port of resources/views/admin/teachers/show.blade.php. */
export default async function TeacherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ moved?: string }>;
}) {
  await requireRole('admin');
  const { id } = await params;
  const { moved } = await searchParams;
  const supabase = await createClient();

  const [{ data: teacher }, { data: students }, { data: others }] = await Promise.all([
    supabase.from('users').select('id, name, phone').eq('id', id).eq('role', 'teacher').maybeSingle(),
    supabase.from('students').select('id, name, grade, points').eq('user_id', id).order('name'),
    supabase.from('users').select('id, name, phone').eq('role', 'teacher').neq('id', id).order('name'),
  ]);

  if (!teacher) notFound();

  const roster = students ?? [];

  return (
    <Page wide>
      <BackLink href="/admin/teachers" />

      {moved ? <Flash>تم نقل {moved} طالب بنجاح</Flash> : null}

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={teacher.name} className="size-12" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[length:var(--text-xl)] font-extrabold text-ink">
              {teacher.name}
            </h1>
            <p className="ltr-nums m-0 text-[length:var(--text-xs)] text-ink-muted">
              {teacher.phone}
            </p>
          </div>
          <ButtonLink href={`/admin/teachers/${teacher.id}/edit`} variant="secondary" size="sm">
            تعديل
          </ButtonLink>
        </div>
      </Card>

      <SectionCard title="الطلاب" count={roster.length}>
        {roster.length === 0 ? (
          <EmptyState icon={<BookIcon />}>لا يوجد طلاب لدى هذا الأستاذ.</EmptyState>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {roster.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-border bg-paper px-3 py-2.5"
              >
                <Avatar name={s.name} className="size-8 text-[length:var(--text-sm)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[length:var(--text-sm)] font-bold text-ink">
                    {s.name}
                  </span>
                  {s.grade ? (
                    <span className="block text-[length:var(--text-xs)] text-ink-muted">
                      {s.grade}
                    </span>
                  ) : null}
                </span>
                <Chip tone="gold">{s.points}</Chip>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="نقل الطلاب إلى أستاذ آخر">
        <TransferStudentsForm
          fromTeacherId={teacher.id}
          students={roster as TransferStudent[]}
          otherTeachers={(others ?? []) as OtherTeacher[]}
        />
      </SectionCard>
    </Page>
  );
}
