'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { SURAHS, SURAH_BY_NUMBER } from '@/lib/quran-surahs';
import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type ProgressFormState =
  | { ok?: true; message?: string; error?: string; fieldErrors?: Record<string, string> }
  | undefined;

const SURAH_NAMES = SURAHS.map((s) => s.name);

/** Mirrors StudentController::storeFollow, including the cross-field surah checks. */
const MemorizationSchema = z.object({
  student_id: z.coerce.number().int().positive(),
  surah: z.string().refine((v) => SURAH_NAMES.includes(v), 'السورة المختارة غير صحيحة.'),
  surah_number: z.coerce.number().int().min(1).max(114),
  from_ayah: z.coerce.number().int().min(1, 'رقم الآية غير صحيح.'),
  to_ayah: z.coerce.number().int().min(1, 'رقم الآية غير صحيح.'),
  score: z.coerce.number().int().min(0).max(100).nullable(),
  homework: z.string().max(255).nullable(),
  daily_review: z.string().max(255).nullable(),
  review_score: z.coerce.number().int().min(0).max(100).nullable(),
  review_homework: z.string().max(255).nullable(),
  notes: z.string().nullable(),
});

const emptyToNull = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

export async function saveMemorization(
  _prev: ProgressFormState,
  formData: FormData,
): Promise<ProgressFormState> {
  await requireRole('teacher');

  const parsed = MemorizationSchema.safeParse({
    student_id: formData.get('student_id'),
    surah: formData.get('surah'),
    surah_number: formData.get('surah_number'),
    from_ayah: formData.get('from_ayah'),
    to_ayah: formData.get('to_ayah'),
    score: emptyToNull(formData.get('score')),
    homework: emptyToNull(formData.get('homework')),
    daily_review: emptyToNull(formData.get('daily_review')),
    review_score: emptyToNull(formData.get('review_score')),
    review_homework: emptyToNull(formData.get('review_homework')),
    notes: emptyToNull(formData.get('notes')),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const d = parsed.data;
  const surah = SURAH_BY_NUMBER.get(d.surah_number);

  // The submitted name and number must agree - the form sends both, so a mismatch
  // means tampering or a stale page.
  if (!surah || surah.name !== d.surah) {
    return { fieldErrors: { surah: 'السورة المختارة غير صحيحة.' } };
  }

  if (d.to_ayah < d.from_ayah) {
    return { fieldErrors: { to_ayah: 'آية النهاية يجب أن تكون بعد آية البداية.' } };
  }

  // Same wording as the Laravel validator.
  const tooLong = `سورة ${surah.name} تحتوي على ${surah.ayahs} آية فقط.`;
  if (d.from_ayah > surah.ayahs) return { fieldErrors: { from_ayah: tooLong } };
  if (d.to_ayah > surah.ayahs) return { fieldErrors: { to_ayah: tooLong } };

  const supabase = await createClient();

  // RLS blocks this insert if the student is not this teacher's.
  const { error } = await supabase.from('progress_logs').insert({
    student_id: d.student_id,
    type: 'memorization',
    surah: d.surah,
    surah_number: d.surah_number,
    from_ayah: d.from_ayah,
    to_ayah: d.to_ayah,
    score: d.score,
    homework: d.homework,
    daily_review: d.daily_review,
    review_score: d.review_score,
    review_homework: d.review_homework,
    notes: d.notes,
  });

  if (error) return { error: 'تعذّر حفظ الحفظ الجديد.' };

  revalidatePath(`/students/${d.student_id}/follow`);
  return { ok: true, message: 'تم حفظ الحفظ الجديد' };
}

/** Mirrors StudentController::storeReview - note score is capped at 10 here, not 100. */
const ReviewSchema = z.object({
  student_id: z.coerce.number().int().positive(),
  weekly_memorization: z.string().trim().min(1, 'هذا الحقل مطلوب.').max(255),
  score: z.coerce.number().int().min(0).max(10).nullable(),
  review_homework: z.string().max(255).nullable(),
});

export async function saveBigReview(
  _prev: ProgressFormState,
  formData: FormData,
): Promise<ProgressFormState> {
  await requireRole('teacher');

  const parsed = ReviewSchema.safeParse({
    student_id: formData.get('student_id'),
    weekly_memorization: formData.get('weekly_memorization'),
    score: emptyToNull(formData.get('score')),
    review_homework: emptyToNull(formData.get('review_homework')),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from('progress_logs').insert({
    student_id: d.student_id,
    type: 'big_review',
    weekly_memorization: d.weekly_memorization,
    score: d.score,
    review_homework: d.review_homework,
  });

  if (error) return { error: 'تعذّر حفظ المراجعة الكبرى.' };

  revalidatePath(`/students/${d.student_id}/follow`);
  return { ok: true, message: 'تم حفظ المراجعة الكبرى' };
}
