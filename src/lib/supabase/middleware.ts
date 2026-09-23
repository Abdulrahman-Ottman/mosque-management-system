import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Role } from '@/lib/roles';
import { homePathForRole } from '@/lib/roles';

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ['/', '/login'];

/**
 * Refreshes the Supabase session and redirects by role.
 *
 * SECURITY: this is a convenience layer, not the security boundary. Next.js
 * middleware has been bypassable in the past (CVE-2025-29927), so every page and
 * Server Action re-checks the role server-side via requireRole(), and RLS enforces
 * ownership in the database regardless of what the application believes.
 */
export async function updateSession(request: NextRequest) {
  // This response carries any refreshed auth cookies that getUser() sets below.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() verifies the token with the Auth server. getSession() only reads the
  // cookie and must not be trusted for anything that gates access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return redirectPreservingCookies(url, supabaseResponse);
  }

  if (user) {
    // Role comes from the JWT here purely to pick a destination. It can be stale for
    // up to one token lifetime, which is harmless for a redirect. Authorization
    // decisions read public.users.role instead - see lib/roles.ts and the RLS policies.
    const role = (user.app_metadata?.app_role ?? 'teacher') as Role;

    if (isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      return redirectPreservingCookies(url, supabaseResponse);
    }

    const area = areaForPath(path);
    if (area && area !== role) {
      // Mirrors EnsureUserHasRole: role checks are strict equality, so an admin
      // genuinely cannot open a teacher route.
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      return redirectPreservingCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}

/** Which role's area a path belongs to, or null if it is shared. */
function areaForPath(path: string): Role | null {
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/parent')) return 'parent';
  if (
    path.startsWith('/dashboard') ||
    path.startsWith('/attendance') ||
    path.startsWith('/students')
  ) {
    return 'teacher';
  }
  return null;
}

/**
 * Carries refreshed auth cookies onto a redirect.
 *
 * Returning a bare NextResponse.redirect() here would DISCARD the cookies that
 * getUser() just refreshed, so the next request would still carry the expired token
 * and bounce again - an infinite redirect loop. This is the single most common bug
 * with @supabase/ssr; do not "simplify" it.
 */
function redirectPreservingCookies(url: URL, carrying: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  carrying.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirect;
}
