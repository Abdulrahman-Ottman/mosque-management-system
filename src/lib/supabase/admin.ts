import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. BYPASSES RLS ENTIRELY.
 *
 * Only for the admin account-management actions that must call auth.admin.* to
 * create or update auth users. Never import this into a client component, and never
 * reach for it to "make a query work" - if a query is being filtered, that is RLS
 * doing its job.
 *
 * Note: creating an auth user is enough on its own. The on_auth_user_created trigger
 * (supabase/03_functions.sql) inserts the matching public.users row inside GoTrue's
 * transaction. Do NOT also insert it here - that would raise a duplicate key on
 * every signup.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    throw new Error('SUPABASE_SECRET_KEY is not set - admin operations are unavailable.');
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
