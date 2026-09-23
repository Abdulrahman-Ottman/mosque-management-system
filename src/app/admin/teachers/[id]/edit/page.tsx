import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { updateTeacher } from '@/actions/accounts';
import { AccountForm, type AccountInitial } from '@/components/AccountForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تعديل بيانات الأستاذ' };

export default async function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from('users').select('id, name, phone').eq('id', id).eq('role', 'teacher').maybeSingle();

  if (!teacher) notFound();

  return (
    <Page>
      <BackLink href="/admin/teachers" />
      <PageHeader title="تعديل بيانات الأستاذ" subtitle={teacher.name} />
      <SectionCard title="بيانات الحساب">
        <AccountForm action={updateTeacher} initial={teacher as AccountInitial} submitLabel="حفظ التعديلات" />
      </SectionCard>
    </Page>
  );
}
