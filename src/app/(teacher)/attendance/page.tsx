import type { Metadata } from 'next';

import { AttendanceForm, type AttendanceStudent } from '@/components/AttendanceForm';
import { ClipboardIcon } from '@/components/icons';
import { BackLink, EmptyState, Page, PageHeader } from '@/components/ui';
import { labelForDateString, today } from '@/lib/arabic-date';
import type { AttendanceStatus } from '@/lib/attendance';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'تسجيل الحضور' };

/** Port of resources/views/attendance.blade.php. */
export default async function AttendancePage() {
  const user = await requireRole('teacher');
  const supabase = await createClient();
  const date = today();

  const { data: students } = await supabase
    .from('students')
    .select('id, name, grade')
    .eq('user_id', user.id)
    .order('name');

  const ids = (students ?? []).map((s) => s.id);

  // Today's existing rows, so re-opening the page shows what was already recorded.
  const { data: logs } = ids.length
    ? await supabase
        .from('attendance_logs')
        .select('student_id, status, absence_reason')
        .eq('date', date)
        .in('student_id', ids)
    : { data: [] };

  const byStudent = new Map(
    (logs ?? []).map((l) => [l.student_id, l as { status: string; absence_reason: string | null }]),
  );

  const rows: AttendanceStudent[] = (students ?? []).map((s) => {
    const log = byStudent.get(s.id);
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      status: (log?.status as AttendanceStatus | undefined) ?? null,
      absenceReason: log?.absence_reason ?? null,
    };
  });

  return (
    <Page>
      <BackLink href="/dashboard" />
      <PageHeader title="تسجيل الحضور" subtitle={labelForDateString(date)} />

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardIcon />}>لا يوجد طلاب لتسجيل حضورهم.</EmptyState>
      ) : (
        <AttendanceForm students={rows} />
      )}
    </Page>
  );
}
