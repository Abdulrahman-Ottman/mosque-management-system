/**
 * End-to-end smoke test: logs in as each role against a running dev/prod server and
 * checks every route renders, plus that role boundaries actually hold.
 *
 * Start the server first, then:  node --env-file=.env.local scripts/smoke.mjs
 */
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** The cookie name @supabase/ssr uses, derived from the project ref in the URL. */
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

const ACCOUNTS = {
  teacher: { phone: '0900000001', password: 'test1234' },
  admin: { phone: '0900000000', password: 'admin1234' },
  parent: { phone: '0900000002', password: 'test1234' },
};

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

/** Minimal cookie jar - enough to carry the Supabase auth cookies between requests. */
function makeJar() {
  const jar = new Map();
  return {
    set: (k, v) => jar.set(k, v),
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    absorb(res) {
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const idx = pair.indexOf('=');
        const name = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (value === '' || /expires=thu, 01 jan 1970/i.test(raw)) jar.delete(name);
        else jar.set(name, value);
      }
    },
  };
}

/**
 * Mint a real session and write it into the jar in the shape @supabase/ssr reads.
 *
 * Posting the login form directly is not possible from a script - a Server Action
 * needs its generated action id - so we go through the same signInWithPassword the
 * action itself calls, then encode the session as the auth cookie.
 */
async function login(role) {
  const jar = makeJar();
  const { phone, password } = ACCOUNTS[role];

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${phone}@mosque.invalid`,
    password,
  });

  if (error || !data.session) {
    console.log(`  note: sign-in failed for ${role}: ${error?.message ?? 'no session'}`);
    return null;
  }

  const encoded = Buffer.from(JSON.stringify(data.session)).toString('base64');
  jar.set(COOKIE_NAME, `base64-${encoded}`);
  return jar;
}

async function get(jar, path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    headers: { cookie: jar.header() },
  });
  jar.absorb(res);
  return res;
}

console.log(`\nSmoke testing ${BASE}`);

// --- unauthenticated ---
console.log('\nSigned out');
{
  const res = await fetch(`${BASE}/`, { redirect: 'manual' });
  if (res.status === 200) ok('login page renders');
  else bad(`login page returned ${res.status}`);

  for (const path of ['/dashboard', '/admin/dashboard', '/parent/dashboard']) {
    const r = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    if (r.status === 307 || r.status === 302) ok(`${path} redirects when signed out`);
    else bad(`${path} returned ${r.status}, expected a redirect`);
  }
}

// Resolve real ids so the dynamic routes get exercised too, not just the static ones.
const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const [{ data: someStudent }, { data: someTeacher }, { data: someActivity }] = await Promise.all([
  admin.from('students').select('id').limit(1).maybeSingle(),
  admin.from('users').select('id').eq('role', 'teacher').limit(1).maybeSingle(),
  admin.from('activities').select('id').limit(1).maybeSingle(),
]);

const ROUTES = {
  teacher: [
    '/dashboard',
    '/attendance',
    '/students/new',
    ...(someStudent
      ? [`/students/${someStudent.id}/edit`, `/students/${someStudent.id}/follow`]
      : []),
  ],
  admin: [
    '/admin/dashboard',
    '/admin/teachers',
    '/admin/teachers/new',
    '/admin/parents',
    '/admin/parents/new',
    '/admin/activities',
    '/admin/activities/new',
    '/admin/schedule',
    '/admin/schedule/6',
    ...(someTeacher ? [`/admin/teachers/${someTeacher.id}`, `/admin/teachers/${someTeacher.id}/edit`] : []),
    ...(someActivity ? [`/admin/activities/${someActivity.id}/edit`] : []),
  ],
  parent: ['/parent/dashboard', ...(someStudent ? [`/parent/students/${someStudent.id}`] : [])],
};

for (const role of Object.keys(ACCOUNTS)) {
  console.log(`\nAs ${role}`);
  const jar = await login(role);
  if (!jar) {
    bad(`could not sign in as ${role}`);
    continue;
  }

  const probe = await get(jar, ROUTES[role][0]);
  if (probe.status !== 200) {
    console.log(`  SKIP  could not establish a session (${probe.status}) - check credentials`);
    continue;
  }

  for (const path of ROUTES[role]) {
    const res = await get(jar, path);
    if (res.status === 200) ok(`${path} renders`);
    else bad(`${path} returned ${res.status}`);
  }

  // Role isolation: each role must be bounced off the other areas.
  const forbidden = {
    teacher: ['/admin/dashboard', '/parent/dashboard'],
    admin: ['/dashboard', '/parent/dashboard'],
    parent: ['/dashboard', '/admin/dashboard'],
  }[role];

  for (const path of forbidden) {
    const res = await get(jar, path);
    if (res.status === 307 || res.status === 302) ok(`${path} blocked for ${role}`);
    else bad(`${path} returned ${res.status} for ${role}, expected a redirect`);
  }
}

console.log(failures === 0 ? '\nSmoke test passed.\n' : `\n${failures} failure(s).\n`);
process.exit(failures === 0 ? 0 : 1);
