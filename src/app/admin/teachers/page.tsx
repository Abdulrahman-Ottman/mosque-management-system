import type { Metadata } from 'next';
import Link from 'next/link';

import { deleteTeacher } from '@/actions/accounts';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { TeacherIcon } from '@/components/icons';
import {
  Avatar, ButtonLink, Card, Chip, EmptyState, ErrorBox, Page, PageHeader, buttonClass,
} from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'الأساتذة' };

/** Port of resources/views/admin/teachers/index.blade.php. */
export default async function TeachersPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  await requireRole('admin');
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: teachers }, { data: students }] = await Promise.all([
    supabase.from('users').select('id, name, phone').eq('role', 'teacher').order('name'),
    supabase.from('students').select('user_id'),
  ]);

  const counts = new Map<string, number>();
  for (const s of students ?? []) counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1);

  return (
    <Page wide>
      <PageHeader
        title="الأساتذة"
        subtitle={`${(teachers ?? []).length} أستاذ`}
        actions={<ButtonLink href="/admin/teachers/new" size="sm">إضافة أستاذ</ButtonLink>}
      />

      {error === 'has-students' ? (
        <ErrorBox>
          لا يمكن حذف هذا الأستاذ لأنه يملك طلابًا مسجلين. الرجاء نقل الطلاب إلى أستاذ آخر أولاً.
        </ErrorBox>
      ) : null}

      {(teachers ?? []).length === 0 ? (
        <EmptyState icon={<TeacherIcon />}>لا يوجد أساتذة بعد.</EmptyState>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {(teachers ?? []).map((t) => {
            const count = counts.get(t.id) ?? 0;
            return (
              <Card as="li" key={t.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[length:var(--text-base)] font-extrabold text-ink">{t.name}</p>
                    <p className="ltr-nums m-0 truncate text-[length:var(--text-xs)] text-ink-muted">{t.phone}</p>
                  </div>
                  <Chip tone={count > 0 ? 'green' : 'gray'}>{count} طالب</Chip>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/teachers/${t.id}`} className={buttonClass('primary', { size: 'sm', className: 'flex-1' })}>
                    التفاصيل
                  </Link>
                  <Link href={`/admin/teachers/${t.id}/edit`} className={buttonClass('secondary', { size: 'sm' })}>
                    تعديل
                  </Link>
                  <form action={deleteTeacher}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmSubmit message={`هل أنت متأكد من حذف حساب ${t.name}؟`}>حذف</ConfirmSubmit>
                  </form>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
