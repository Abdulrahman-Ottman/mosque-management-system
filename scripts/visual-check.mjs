/**
 * Renders real pages in a headless browser and measures every icon.
 *
 * This exists because of a bug that markup inspection could not catch: an arbitrary
 * Tailwind class (`size-[19px]`) silently produced no CSS, so the SVGs fell back to
 * the browser's default replaced-element size and blew up to 300x150. The HTML looked
 * perfectly correct. Only measuring the laid-out box reveals it.
 *
 *   node --env-file=.env.local scripts/visual-check.mjs
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];

/** An icon larger than this is almost certainly an unsized SVG. */
const MAX_ICON = 48;

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

async function sessionCookie(phone, password) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${phone}@mosque.invalid`,
    password,
  });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);
  return {
    name: `sb-${PROJECT_REF}-auth-token`,
    value: `base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`,
    domain: 'localhost',
    path: '/',
  };
}

/** Measure every svg on the page and report anything oversized or collapsed. */
async function checkIcons(page, label) {
  const icons = await page.$$eval('svg', (nodes) =>
    nodes
      // Skip the Next.js dev-tools badge - it is not part of the app.
      .filter((n) => !n.closest('nextjs-portal, [data-nextjs-dev-tools-button]'))
      // Skip anything deliberately hidden at this breakpoint (e.g. the navbar
      // username, which is `hidden sm:flex`). A display:none element correctly has
      // no box, so measuring it would be a false alarm.
      .filter((n) => n.getClientRects().length > 0)
      .map((n) => {
        const r = n.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          cls: n.getAttribute('class') ?? '',
        };
      }),
  );

  if (icons.length === 0) {
    ok(`${label}: no icons on page`);
    return;
  }

  const oversized = icons.filter((i) => i.w > MAX_ICON || i.h > MAX_ICON);
  const collapsed = icons.filter((i) => i.w === 0 || i.h === 0);

  if (oversized.length) {
    bad(
      `${label}: ${oversized.length}/${icons.length} icon(s) oversized — ` +
        oversized.map((i) => `${i.w}x${i.h} (${i.cls.slice(0, 28)})`).join(', '),
    );
  } else if (collapsed.length) {
    bad(`${label}: ${collapsed.length}/${icons.length} icon(s) collapsed to zero`);
  } else {
    const sizes = [...new Set(icons.map((i) => `${i.w}x${i.h}`))].join(', ');
    ok(`${label}: ${icons.length} icon(s), all sane — ${sizes}`);
  }
}

/** Catch elements spilling outside the viewport, which is what "broken layout" looks like. */
async function checkOverflow(page, label, width) {
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollW > width + 2) bad(`${label}: horizontal overflow — content is ${scrollW}px wide`);
  else ok(`${label}: no horizontal overflow`);
}

const browser = await chromium.launch();
console.log(`\nVisual check against ${BASE}`);

const VIEWPORTS = [
  { name: 'small phone', width: 360, height: 780 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'laptop', width: 1440, height: 900 },
];

const PAGES = [
  { path: '/', role: null, label: 'login' },
  { path: '/dashboard', role: 'teacher', label: 'teacher dashboard' },
  { path: '/attendance', role: 'teacher', label: 'attendance' },
  { path: '/admin/dashboard', role: 'admin', label: 'admin dashboard' },
  { path: '/admin/schedule/6', role: 'admin', label: 'schedule day' },
  { path: '/parent/dashboard', role: 'parent', label: 'parent dashboard' },
];

const CREDS = {
  teacher: ['0900000001', 'test1234'],
  admin: ['0900000000', 'admin1234'],
  parent: ['0900000002', 'test1234'],
};

const cookies = {};
for (const [role, [phone, pw]] of Object.entries(CREDS)) {
  cookies[role] = await sessionCookie(phone, pw);
}

for (const vp of VIEWPORTS) {
  console.log(`\n${vp.name} (${vp.width}px)`);
  for (const target of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    if (target.role) await ctx.addCookies([cookies[target.role]]);
    const page = await ctx.newPage();

    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' });
    await checkIcons(page, target.label);
    await checkOverflow(page, target.label, vp.width);

    await ctx.close();
  }
}

await browser.close();
console.log(failures === 0 ? '\nVisual check passed.\n' : `\n${failures} failure(s).\n`);
process.exit(failures === 0 ? 0 : 1);
