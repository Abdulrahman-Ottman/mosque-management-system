import type { Metadata } from 'next';

import { createTeacher } from '@/actions/accounts';
import { AccountForm } from '@/components/AccountForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';

export const metadata: Metadata = { title: 'إضافة أستاذ' };

export default async function NewTeacherPage() {
  await requireRole('admin');
  return (
    <Page>
      <BackLink href="/admin/teachers" />
      <PageHeader title="إضافة أستاذ" subtitle="سيستخدم رقم الهاتف لتسجيل الدخول" />
      <SectionCard title="بيانات الحساب">
        <AccountForm action={createTeacher} submitLabel="إنشاء الحساب" />
      </SectionCard>
    </Page>
  );
}
