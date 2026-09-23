import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components and Server Actions.
 *
 * Runs as the signed-in user, so every query is subject to RLS. This is the client
 * almost everything should use - see ./admin.ts for the rare exceptions.
 */
export async function createClient() {
  // Next 15+ : cookies() is async.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Only getAll/setAll are supported; passing get/set/remove throws.
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // A Server Component cannot write cookies. This is expected and safe to
            // swallow ONLY because middleware refreshes the session on every request.
            // Without this catch, any token refresh landing mid-render would throw
            // and 500 the page - intermittently, roughly once an hour per user.
          }
        },
      },
    },
  );
}
