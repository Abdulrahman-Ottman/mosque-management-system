'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { phoneToEmail } from '@/lib/phone';
import { homePathForRole, type Role } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export type AuthFormState = { error?: string } | undefined;

const LoginSchema = z.object({
  phone: z.string().trim().min(1, 'رقم الهاتف مطلوب.'),
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
});

/** Deliberately identical for a wrong phone and a wrong password. */
const INVALID_CREDENTIALS = 'رقم الهاتف أو كلمة المرور غير صحيحة.';

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    phone: formData.get('phone'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS };
  }

  const supabase = await createClient();

  // Supabase Auth is email-based; the phone maps to a synthetic address. Both this
  // and the account-creation path go through phoneToEmail(), so a number typed with
  // Arabic-Indic digits reaches the same account as the ASCII form.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(parsed.data.phone),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: INVALID_CREDENTIALS };
  }

  // Read the role from the database rather than the freshly-minted JWT, so this
  // agrees with what RLS will enforce on the very next request.
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = (profile?.role ?? 'teacher') as Role;

  // redirect() throws NEXT_REDIRECT, so it must sit outside any try/catch.
  redirect(homePathForRole(role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
