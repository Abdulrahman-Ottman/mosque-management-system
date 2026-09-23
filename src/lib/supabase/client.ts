import { createBrowserClient } from '@supabase/ssr';

/** Supabase client for the few client components that need one. Subject to RLS. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
