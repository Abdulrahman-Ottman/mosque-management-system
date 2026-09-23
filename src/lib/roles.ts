import 'server-only';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export const ROLES = ['admin', 'teacher', 'parent'] as const;
export type Role = (typeof ROLES)[number];

export type CurrentUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
};

/** Where each role lands after login. Mirrors AuthController::login's match(). */
export function homePathForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'parent':
      return '/parent/dashboard';
    default:
      return '/dashboard';
  }
}

/**
 * The signed-in user, read from public.users.
 *
 * Deliberately NOT read from the JWT: app_metadata changes do not propagate into an
 * already-issued token, so a demoted user would keep their old privileges until it
 * expired. This costs one indexed lookup and is always correct.
 *
 * Returns null when signed out.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('id, name, phone, role')
    .eq('id', user.id)
    .single();

  return (data as CurrentUser | null) ?? null;
}

/** Require a session, or bounce to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  return user;
}

/**
 * Require a specific role. This is the real gate - middleware only redirects, and
 * has historically been bypassable, so every page and action calls this.
 *
 * Strict equality, matching EnsureUserHasRole: an admin cannot open teacher routes.
 */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) redirect(homePathForRole(user.role));
  return user;
}
