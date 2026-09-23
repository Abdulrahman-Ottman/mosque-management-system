import type { Metadata } from 'next';

import { createActivity } from '@/actions/activities';
import { ActivityForm } from '@/components/ActivityForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';

export const metadata: Metadata = { title: 'إضافة نشاط' };

export default async function NewActivityPage() {
  await requireRole('admin');

  return (
    <Page>
      <BackLink href="/admin/activities" />
      <PageHeader title="إضافة نشاط" />
      <SectionCard title="بيانات النشاط">
        <ActivityForm action={createActivity} submitLabel="إضافة النشاط" />
      </SectionCard>
    </Page>
  );
}
