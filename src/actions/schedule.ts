'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type ScheduleFormState = { error?: string } | undefined;

const ContentSchema = z.string().trim().min(1, 'المحتوى مطلوب.').max(500);

/** Port of ScheduleController::store - appends after the current highest sort_order. */
export async function addScheduleItem(
  _prev: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  await requireRole('admin');

  const day = Number(formData.get('day'));
  if (!Number.isInteger(day) || day < 0 || day > 6) return { error: 'يوم غير صحيح.' };

  const parsed = ContentSchema.safeParse(formData.get('content'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();

  const { data: last } = await supabase
    .from('schedule_items')
    .select('sort_order')
    .eq('day_of_week', day)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('schedule_items').insert({
    day_of_week: day,
    content: parsed.data,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return { error: 'تعذّر إضافة القسم.' };

  revalidatePath(`/admin/schedule/${day}`);
  revalidatePath('/admin/schedule');
  return undefined;
}

export async function updateScheduleItem(formData: FormData): Promise<void> {
  await requireRole('admin');

  const id = Number(formData.get('id'));
  const day = Number(formData.get('day'));
  const parsed = ContentSchema.safeParse(formData.get('content'));
  if (!Number.isInteger(id) || !parsed.success) return;

  const supabase = await createClient();
  await supabase.from('schedule_items').update({ content: parsed.data }).eq('id', id);

  revalidatePath(`/admin/schedule/${day}`);
}

export async function deleteScheduleItem(formData: FormData): Promise<void> {
  await requireRole('admin');

  const id = Number(formData.get('id'));
  const day = Number(formData.get('day'));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  await supabase.from('schedule_items').delete().eq('id', id);

  revalidatePath(`/admin/schedule/${day}`);
  revalidatePath('/admin/schedule');
}

/**
 * Port of ScheduleController::move. The Laravel version swapped sort_order with two
 * separate updates, which can collide under concurrent reordering; move_schedule_item()
 * does the swap in a single transaction.
 */
export async function moveScheduleItem(formData: FormData): Promise<void> {
  await requireRole('admin');

  const id = Number(formData.get('id'));
  const day = Number(formData.get('day'));
  const direction = String(formData.get('direction'));
  if (!Number.isInteger(id) || !['up', 'down'].includes(direction)) return;

  const supabase = await createClient();
  await supabase.rpc('move_schedule_item', { p_id: id, p_direction: direction });

  revalidatePath(`/admin/schedule/${day}`);
}
