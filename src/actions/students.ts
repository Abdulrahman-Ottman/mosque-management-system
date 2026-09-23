'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

/**
 * Mirrors StudentController::validateStudent(), including the follow-up check that
 * the chosen parent really is a parent account.
 */
const StudentSchema = z.object({
  name: z.string().trim().min(1, 'اسم الطالب مطلوب.').max(255),
  parent_id: z.string().uuid('الرجاء اختيار ولي أمر صحيح من القائمة.'),
  grade: z.string().trim().max(255).optional().or(z.literal('')),
  address: z.string().trim().max(255).optional().or(z.literal('')),
});

function parseStudent(formData: FormData) {
  return StudentSchema.safeParse({
    name: formData.get('name'),
    parent_id: formData.get('parent_id'),
    grade: formData.get('grade') ?? '',
    address: formData.get('address') ?? '',
  });
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    out[key] ??= issue.message;
  }
  return out;
}

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole('teacher');
  const parsed = parseStudent(formData);

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();

  const { data: parent } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', parsed.data.parent_id)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { fieldErrors: { parent_id: 'الرجاء اختيار ولي أمر صحيح من القائمة.' } };
  }

  const { error } = await supabase.from('students').insert({
    user_id: user.id,
    parent_id: parsed.data.parent_id,
    name: parsed.data.name,
    grade: parsed.data.grade || null,
    address: parsed.data.address || null,
  });

  if (error) return { error: 'تعذّر حفظ الطالب. حاول مرة أخرى.' };

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole('teacher');

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'طالب غير معروف.' };

  const parsed = parseStudent(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();

  const { data: parent } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', parsed.data.parent_id)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { fieldErrors: { parent_id: 'الرجاء اختيار ولي أمر صحيح من القائمة.' } };
  }

  // No explicit user_id filter is needed for safety - RLS already restricts this to
  // the teacher's own students, which is precisely the check StudentController::update
  // is missing today. The affected-row count tells us whether it applied.
  const { data, error } = await supabase
    .from('students')
    .update({
      name: parsed.data.name,
      parent_id: parsed.data.parent_id,
      grade: parsed.data.grade || null,
      address: parsed.data.address || null,
    })
    .eq('id', id)
    .select('id');

  if (error || !data?.length) return { error: 'تعذّر تحديث بيانات الطالب.' };

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteStudent(formData: FormData): Promise<void> {
  await requireRole('teacher');

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  await supabase.from('students').delete().eq('id', id);

  revalidatePath('/dashboard');
}

/** نقاط: الإضافة والخصم عبر دالة ذرية في قاعدة البيانات. */
const PointsSchema = z.object({
  id: z.coerce.number().int().positive(),
  points: z.coerce.number().int().min(1, 'الرجاء إدخال عدد نقاط صحيح.'),
});

async function adjustPoints(formData: FormData, sign: 1 | -1): Promise<FormState> {
  await requireRole('teacher');

  const parsed = PointsSchema.safeParse({
    id: formData.get('id'),
    points: formData.get('points'),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();

  // adjust_student_points() applies `greatest(0, points + delta)` in one statement,
  // so concurrent updates cannot lose a change the way the PHP read-modify-write can.
  const { error } = await supabase.rpc('adjust_student_points', {
    p_student_id: parsed.data.id,
    p_delta: sign * parsed.data.points,
  });

  if (error) return { error: 'تعذّر تعديل النقاط.' };

  revalidatePath(`/students/${parsed.data.id}/follow`);
  revalidatePath('/dashboard');
  return { error: undefined };
}

export async function addPoints(_prev: FormState, formData: FormData): Promise<FormState> {
  return adjustPoints(formData, 1);
}

export async function subtractPoints(_prev: FormState, formData: FormData): Promise<FormState> {
  return adjustPoints(formData, -1);
}
