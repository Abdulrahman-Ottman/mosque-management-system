'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { STATUS_EXCUSED_ABSENCE, isAttendanceStatus } from '@/lib/attendance';
import { today } from '@/lib/arabic-date';
import { getCurrentUser } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type AttendanceFormState = { error?: string } | undefined;

/**
 * Port of DashboardController::storeAttendance.
 *
 * The whole class is saved in ONE call to save_attendance_batch(), which does the
 * penalty diff and the upsert inside a single transaction. That is what keeps
 * re-submitting the same day idempotent, and what stops a mid-batch failure from
 * leaving points permanently wrong - the PHP version's `max(0, ...)` clamp is lossy,
 * so a partial write cannot be reconstructed.
 */
export async function saveAttendance(
  _prev: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  // Deliberately NOT requireRole(): that redirects to the login page, which throws
  // away everything the teacher just ticked and gives no explanation. A submit
  // handler should report the problem and let them retry.
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'انتهت الجلسة. أعد تسجيل الدخول في تبويب آخر ثم اضغط حفظ مرة أخرى.' };
  }
  if (user.role !== 'teacher') {
    return { error: 'هذا الإجراء متاح للأساتذة فقط.' };
  }

  const entries: Array<{ student_id: number; status: string; absence_reason: string | null }> = [];

  for (const [key, value] of formData.entries()) {
    const match = /^attendance\[(\d+)\]$/.exec(key);
    if (!match) continue;

    const status = String(value);
    if (!isAttendanceStatus(status)) {
      return { error: 'حالة حضور غير صحيحة.' };
    }

    const studentId = Number(match[1]);
    const reasonRaw = formData.get(`absence_reason[${studentId}]`);
    const reason = typeof reasonRaw === 'string' ? reasonRaw.trim().slice(0, 255) : '';

    entries.push({
      student_id: studentId,
      status,
      // سبب الغياب يُحفظ فقط مع "غياب بعذر" - the SQL enforces this too.
      absence_reason: status === STATUS_EXCUSED_ABSENCE && reason ? reason : null,
    });
  }

  if (entries.length === 0) {
    return { error: 'لم يتم تحديد حالة أي طالب.' };
  }

  const supabase = await createClient();

  // The date is passed explicitly rather than letting Postgres call current_date,
  // so the app's timezone decision lives in one place (lib/arabic-date.ts).
  const { error } = await supabase.rpc('save_attendance_batch', {
    p_date: today(),
    p_entries: entries,
  });

  if (error) {
    // RLS raises 42501 if any student in the batch is not this teacher's, and the
    // whole transaction rolls back. The code is appended because without it a
    // failure here is untraceable in production - there is no log to read.
    const code = error.code ? ` (${error.code})` : '';
    return {
      error: `تعذّر حفظ الحضور. تأكد أن جميع الطلاب تابعون لك وحاول مجددًا.${code}`,
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/attendance');
  redirect('/dashboard?saved=1');
}
