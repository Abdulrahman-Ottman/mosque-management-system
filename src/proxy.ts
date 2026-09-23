import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the PWA files.
     *
     * The PWA entries matter: a service worker or manifest that 307s to the login
     * page cannot be registered or parsed, which silently makes the app
     * un-installable. They are public static files and never need a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|icons/|sw\.js|manifest\.webmanifest|offline\.html|robots\.txt|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
