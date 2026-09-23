import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { updateParent } from '@/actions/accounts';
import { AccountForm, type AccountInitial } from '@/components/AccountForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تعديل بيانات ولي الأمر' };

export default async function EditParentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  const supabase = await createClient();

  const { data: parent } = await supabase
    .from('users').select('id, name, phone').eq('id', id).eq('role', 'parent').maybeSingle();

  if (!parent) notFound();

  return (
    <Page>
      <BackLink href="/admin/parents" />
      <PageHeader title="تعديل بيانات ولي الأمر" subtitle={parent.name} />
      <SectionCard title="بيانات الحساب">
        <AccountForm action={updateParent} initial={parent as AccountInitial} submitLabel="حفظ التعديلات" />
      </SectionCard>
    </Page>
  );
}
