import type { Metadata } from 'next';

import { createParent } from '@/actions/accounts';
import { AccountForm } from '@/components/AccountForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';

export const metadata: Metadata = { title: 'إضافة ولي أمر' };

export default async function NewParentPage() {
  await requireRole('admin');
  return (
    <Page>
      <BackLink href="/admin/parents" />
      <PageHeader title="إضافة ولي أمر" subtitle="سيستخدم رقم الهاتف لتسجيل الدخول" />
      <SectionCard title="بيانات الحساب">
        <AccountForm action={createParent} submitLabel="إنشاء الحساب" />
      </SectionCard>
    </Page>
  );
}
