import type { Metadata } from 'next';
import Link from 'next/link';

import { deleteParent } from '@/actions/accounts';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { UsersIcon } from '@/components/icons';
import { Avatar, ButtonLink, Card, Chip, EmptyState, Page, PageHeader, buttonClass } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'أولياء الأمور' };

/** Port of resources/views/admin/parents/index.blade.php. */
export default async function ParentsPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const [{ data: parents }, { data: students }] = await Promise.all([
    supabase.from('users').select('id, name, phone').eq('role', 'parent').order('name'),
    supabase.from('students').select('parent_id'),
  ]);

  const counts = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.parent_id) counts.set(s.parent_id, (counts.get(s.parent_id) ?? 0) + 1);
  }

  return (
    <Page wide>
      <PageHeader
        title="أولياء الأمور"
        subtitle={`${(parents ?? []).length} ولي أمر`}
        actions={<ButtonLink href="/admin/parents/new" size="sm">إضافة ولي أمر</ButtonLink>}
      />

      {(parents ?? []).length === 0 ? (
        <EmptyState icon={<UsersIcon />}>لا يوجد أولياء أمور بعد.</EmptyState>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {(parents ?? []).map((p) => {
            const count = counts.get(p.id) ?? 0;
            return (
              <Card as="li" key={p.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[length:var(--text-base)] font-extrabold text-ink">{p.name}</p>
                    <p className="ltr-nums m-0 truncate text-[length:var(--text-xs)] text-ink-muted">{p.phone}</p>
                  </div>
                  <Chip tone={count > 0 ? 'green' : 'gray'}>{count} ابن</Chip>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/parents/${p.id}/edit`} className={buttonClass('secondary', { size: 'sm', className: 'flex-1' })}>
                    تعديل
                  </Link>
                  <form action={deleteParent}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmit message={`هل أنت متأكد من حذف حساب ${p.name}؟ سيبقى الطلاب بدون ولي أمر.`}>
                      حذف
                    </ConfirmSubmit>
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
