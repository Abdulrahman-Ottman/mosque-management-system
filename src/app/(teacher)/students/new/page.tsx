import type { Metadata } from 'next';

import { StudentForm, type ParentOption } from '@/components/StudentForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'إضافة طالب' };

/** Port of resources/views/create-student.blade.php. */
export default async function NewStudentPage() {
  await requireRole('teacher');
  const supabase = await createClient();

  // A policy lets teachers read parent accounts so this picker can be populated.
  const { data: parents } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('role', 'parent')
    .order('name');

  return (
    <Page>
      <BackLink href="/dashboard" />
      <PageHeader title="إضافة طالب" subtitle="أدخل بيانات الطالب الجديد" />
      <SectionCard title="بيانات الطالب">
        <StudentForm parents={(parents ?? []) as ParentOption[]} />
      </SectionCard>
    </Page>
  );
}
