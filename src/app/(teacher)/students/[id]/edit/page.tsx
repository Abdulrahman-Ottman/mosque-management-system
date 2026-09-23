import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StudentForm, type ParentOption, type StudentInitial } from '@/components/StudentForm';
import { BackLink, Page, PageHeader, SectionCard } from '@/components/ui';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تعديل بيانات الطالب' };

/** Port of resources/views/edite-student.blade.php (typo in the original filename). */
export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('teacher');
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) notFound();

  const supabase = await createClient();

  // RLS means another teacher's student simply is not found here - the ownership
  // check StudentController::edit is missing today.
  const [{ data: student }, { data: parents }] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, parent_id, grade, address')
      .eq('id', studentId)
      .maybeSingle(),
    supabase.from('users').select('id, name, phone').eq('role', 'parent').order('name'),
  ]);

  if (!student) notFound();

  return (
    <Page>
      <BackLink href="/dashboard" />
      <PageHeader title="تعديل بيانات الطالب" subtitle={student.name} />
      <SectionCard title="بيانات الطالب">
        <StudentForm
          parents={(parents ?? []) as ParentOption[]}
          initial={student as StudentInitial}
        />
      </SectionCard>
    </Page>
  );
}
