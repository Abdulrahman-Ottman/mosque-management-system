'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { normalizePhone, phoneToEmail } from '@/lib/phone';
import { requireRole } from '@/lib/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type AccountFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

/** Supabase's own minimum is 6; the Laravel rule was 4, so 6 is the binding one. */
const PASSWORD_MIN = 6;

const CreateSchema = z.object({
  name: z.string().trim().min(1, 'الاسم مطلوب.').max(255),
  phone: z.string().trim().min(1, 'رقم الهاتف مطلوب.').max(255),
  password: z.string().min(PASSWORD_MIN, `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN} أحرف.`),
});

const UpdateSchema = CreateSchema.extend({
  id: z.string().uuid(),
  // Blank means "keep the current password".
  password: z
    .string()
    .refine((v) => v === '' || v.length >= PASSWORD_MIN, `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN} أحرف.`),
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    out[key] ??= issue.message;
  }
  return out;
}

type Role = 'teacher' | 'parent';
const listPath = (role: Role) => (role === 'teacher' ? '/admin/teachers' : '/admin/parents');

/**
 * Creating an account is ONE write: auth.admin.createUser().
 *
 * The on_auth_user_created trigger inserts the public.users row inside GoTrue's own
 * transaction, so a duplicate phone aborts the auth user too and no orphan can be
 * left behind. Do not add an insert here - that would collide with the trigger.
 */
async function createAccount(
  formData: FormData,
  role: Role,
): Promise<AccountFormState> {
  await requireRole('admin');

  const parsed = CreateSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: 'رقم الهاتف غير صحيح.' } };

  const supabase = await createClient();

  // Pre-check so we can give a proper Arabic message; the unique index is still the
  // authority, since GoTrue only reports trigger failures as an opaque error.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) return { fieldErrors: { phone: 'رقم الهاتف مستخدم بالفعل.' } };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, phone, role },
    app_metadata: { app_role: role },
  });

  if (error) {
    if (/already|duplicate/i.test(error.message)) {
      return { fieldErrors: { phone: 'رقم الهاتف مستخدم بالفعل.' } };
    }
    return { error: 'تعذّر إنشاء الحساب.' };
  }

  revalidatePath(listPath(role));
  redirect(listPath(role));
}

/**
 * Updating a phone is also an auth email change - the one genuinely two-phase write
 * in the app. Auth goes first so a failure there leaves the profile untouched.
 */
async function updateAccount(formData: FormData, role: Role): Promise<AccountFormState> {
  await requireRole('admin');

  const parsed = UpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    password: formData.get('password') ?? '',
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: 'رقم الهاتف غير صحيح.' } };

  const supabase = await createClient();

  const { data: clash } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .neq('id', parsed.data.id)
    .maybeSingle();

  if (clash) return { fieldErrors: { phone: 'رقم الهاتف مستخدم بالفعل.' } };

  const admin = createAdminClient();

  const authPatch: { email: string; password?: string } = { email: phoneToEmail(phone) };
  if (parsed.data.password) authPatch.password = parsed.data.password;

  const { error: authError } = await admin.auth.admin.updateUserById(parsed.data.id, {
    ...authPatch,
    user_metadata: { name: parsed.data.name, phone, role },
  });

  if (authError) return { error: 'تعذّر تحديث بيانات الدخول.' };

  const { error } = await admin
    .from('users')
    .update({ name: parsed.data.name, phone })
    .eq('id', parsed.data.id);

  if (error) return { error: 'تم تحديث الدخول لكن تعذّر تحديث الملف الشخصي.' };

  revalidatePath(listPath(role));
  redirect(listPath(role));
}

async function deleteAccount(formData: FormData, role: Role): Promise<void> {
  await requireRole('admin');

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const supabase = await createClient();

  if (role === 'teacher') {
    // Same guard as TeacherAccountController::destroy. The FK is RESTRICT, so the
    // delete would fail anyway - this just produces a comprehensible message.
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    if (count && count > 0) {
      redirect('/admin/teachers?error=has-students');
    }
  }

  const admin = createAdminClient();
  // Deleting the auth user cascades to public.users. A parent's children are left in
  // place with parent_id set to null.
  await admin.auth.admin.deleteUser(id);

  revalidatePath(listPath(role));
  redirect(listPath(role));
}

export async function createTeacher(_p: AccountFormState, fd: FormData) {
  return createAccount(fd, 'teacher');
}
export async function updateTeacher(_p: AccountFormState, fd: FormData) {
  return updateAccount(fd, 'teacher');
}
export async function deleteTeacher(fd: FormData) {
  return deleteAccount(fd, 'teacher');
}
export async function createParent(_p: AccountFormState, fd: FormData) {
  return createAccount(fd, 'parent');
}
export async function updateParent(_p: AccountFormState, fd: FormData) {
  return updateAccount(fd, 'parent');
}
export async function deleteParent(fd: FormData) {
  return deleteAccount(fd, 'parent');
}

/** Port of TeacherAccountController::transferStudents. */
export async function transferStudents(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireRole('admin');

  const fromId = String(formData.get('from_teacher_id') ?? '');
  const toId = String(formData.get('to_teacher_id') ?? '');
  const ids = formData
    .getAll('student_ids')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  if (!toId || toId === fromId) {
    return { error: 'الرجاء اختيار أستاذ آخر صحيح لنقل الطلاب إليه.' };
  }
  if (ids.length === 0) {
    return { error: 'لم يتم تحديد أي طالب صحيح للنقل.' };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', toId)
    .maybeSingle();

  if (!target || target.role !== 'teacher') {
    return { error: 'الرجاء اختيار أستاذ آخر صحيح لنقل الطلاب إليه.' };
  }

  // Only move students the source teacher actually owns.
  const { data: moved, error } = await supabase
    .from('students')
    .update({ user_id: toId })
    .eq('user_id', fromId)
    .in('id', ids)
    .select('id');

  if (error) return { error: 'تعذّر نقل الطلاب.' };
  if (!moved?.length) return { error: 'لم يتم تحديد أي طالب صحيح للنقل.' };

  revalidatePath(`/admin/teachers/${fromId}`);
  revalidatePath('/admin/teachers');
  redirect(`/admin/teachers/${fromId}?moved=${moved.length}`);
}
