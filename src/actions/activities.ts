'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type ActivityFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

/** Mirrors ActivityController's validation rules. */
const ActivitySchema = z.object({
  title: z.string().trim().min(1, 'عنوان النشاط مطلوب.').max(255),
  description: z.string().trim().max(2000).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ غير صحيح.'),
  students_count: z.coerce.number().int().min(0, 'العدد يجب ألا يكون سالبًا.'),
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    out[key] ??= issue.message;
  }
  return out;
}

function parse(formData: FormData) {
  const description = String(formData.get('description') ?? '').trim();
  return ActivitySchema.safeParse({
    title: formData.get('title'),
    description: description === '' ? null : description,
    date: formData.get('date'),
    students_count: formData.get('students_count') || 0,
  });
}

export async function createActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  await requireRole('admin');

  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('activities').insert(parsed.data);

  if (error) return { error: 'تعذّر إضافة النشاط.' };

  revalidatePath('/admin/activities');
  redirect('/admin/activities');
}

export async function updateActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  await requireRole('admin');

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'نشاط غير معروف.' };

  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('activities').update(parsed.data).eq('id', id);

  if (error) return { error: 'تعذّر تحديث النشاط.' };

  revalidatePath('/admin/activities');
  redirect('/admin/activities');
}

export async function deleteActivity(formData: FormData): Promise<void> {
  await requireRole('admin');

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  await supabase.from('activities').delete().eq('id', id);

  revalidatePath('/admin/activities');
}
