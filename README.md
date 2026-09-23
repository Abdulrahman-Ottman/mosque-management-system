# mosque-next

Next.js 16 (App Router) + Supabase port of the Laravel mosque app. The Laravel app in
the parent directory is untouched and still runs; this is a complete parallel
implementation.

**Status: feature-complete.** All 21 pages across all three roles are ported, and the
whole surface is verified — lint, typecheck, 36 unit tests, a database-level RLS
suite, and an end-to-end smoke test that signs in as each role and loads every route.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase project values
```

Keys come from **Project Settings → API Keys**. Supabase renamed these, so the
mapping from older docs is:

| Older name | What you'll see now | Goes in |
|---|---|---|
| `anon` key | **Publishable key** (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `service_role` key | **Secret key** (`sb_secret_…`) | `SUPABASE_SECRET_KEY` |

The publishable key is safe in the browser — it is subject to RLS. The secret key
bypasses RLS entirely and must never get a `NEXT_PUBLIC_` prefix.

Then open the Supabase SQL editor and run, **in order**:

1. `supabase/01_schema.sql` — tables, constraints, indexes
2. `supabase/02_policies.sql` — row level security
3. `supabase/03_functions.sql` — atomic mutations + the auth trigger
4. `supabase/04_seed_surahs.sql` — the 114 surahs

Create the first account. The database starts empty and there is no registration
route, so without this nobody can log in:

```bash
npm run user:create -- "مدير النظام" 0900000000 admin "<password>"
npm run db:verify          # confirms schema, seed, functions and RLS
npm run dev
```

Optionally `npm run db:seed` adds sample students and a weekly schedule for
development.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run verify` | lint + typecheck + unit tests + build |
| `npm test` | unit tests for the ported business logic |
| `npm run db:test` | rebuild a throwaway Postgres in Docker and run the schema + RLS suite |
| `npm run db:verify` | check a real Supabase project: schema, seed, functions, RLS |
| `npm run db:seed` | add sample students + a weekly schedule (idempotent) |
| `npm run smoke` | sign in as each role and load every route (server must be running) |
| `npm run visual` | render pages in a headless browser and measure every icon + check for overflow |
| `npm run user:create -- "<name>" <phone> <role> <password>` | create a login account |

## Deploying to Vercel

1. Push to GitHub, then Vercel → New Project → import, with **Root Directory** set to
   `mosque-next`.
2. Add the four env vars from `.env.local`. Double-check `SUPABASE_SECRET_KEY` has no
   `NEXT_PUBLIC_` prefix.
3. Supabase → Authentication → URL Configuration: add the Vercel domain.
4. Supabase → Authentication → Rate Limits: raise the token limit. The default is 30
   requests per 5 minutes per IP, and a mosque behind one connection with everyone
   logging in at class time will hit it.
5. Change any development passwords before real use.

## Architecture

Server Components query Supabase directly; mutations are Server Actions. Only a
handful of components are client-side: the attendance form, the follow-up page's tabs,
its memorization form, its log modal and points panel, the student-transfer form, the
schedule row editor, plus the shared `Combobox` and `ConfirmSubmit`.

```
src/
  app/            routes, grouped by role: (teacher), admin/, parent/
  actions/        one file per old Laravel controller
  components/     the design system + client islands
  lib/            ported business logic, Supabase clients, role helpers
supabase/         schema, policies, functions, seeds + a Dockerised test suite
scripts/          setup, verification and smoke-test tooling
```

## Installable app (PWA)

The site installs to a phone or desktop as a standalone app. `src/app/manifest.ts`
serves the manifest, `public/sw.js` is the service worker, and `InstallApp` renders the
install button on the login page (plus a compact one in the navbar for signed-in
users). Icons are generated from the logo by `node scripts/generate-icons.mjs`.

**The service worker deliberately caches almost nothing.** Every page is behind a login
and shows one user's data, and a mosque phone or tablet may be shared, so caching page
HTML could show one user another user's data after logout. It caches only
user-independent files — hashed build output, icons, images — and uses network-first
for navigation with an offline page as the fallback. Supabase requests are never
touched. Do not "improve" this by caching pages.

**`sw.js`, `manifest.webmanifest` and `offline.html` are excluded from the proxy
matcher** in `src/proxy.ts`. If they get auth-gated they return a 307 to the login page,
the service worker fails to register and the manifest fails to parse — which silently
makes the app un-installable with no visible error.

Installation needs HTTPS. It works on `localhost` for testing, and on any Vercel domain.

**Never size an icon with an arbitrary Tailwind class.** `size-[19px]` silently
compiles to *nothing* here, which leaves the SVG with no width or height, so it falls
back to the browser's default replaced-element size and renders enormous. The markup
looks perfectly correct, so this is invisible to code review. Use the standard scale
(`size-4`, `size-5`) — and every icon also carries `width="1em" height="1em"` as a
backstop so a missing class can never blow the layout up again. `npm run visual`
measures the rendered boxes and fails on anything oversized or collapsed.

## Things worth knowing before changing anything

**Login is phone + password.** Supabase Auth is email-based, so the phone maps to a
synthetic `<phone>@mosque.invalid` address. `normalizePhone()` in `src/lib/phone.ts`
folds Arabic-Indic digits (`٠٩٤٤…`) to ASCII and must be applied on **both** the login
and the account-creation path — otherwise an account created with one digit form can
never be logged into with the other.

**Role is read from `public.users`, never from the JWT.** A JWT claim would be faster
but goes stale: `app_metadata` does not propagate into an already-issued token, so a
demoted admin would keep admin access until it expired. The JWT claim is used only to
pick a redirect destination in `proxy.ts`.

**`proxy.ts` is not the security boundary.** Next middleware has been bypassable
(CVE-2025-29927). Every page calls `requireRole()` and RLS enforces ownership in the
database regardless of what the app believes.

**Do not insert into `public.users` from application code.** The `on_auth_user_created`
trigger already does it, inside GoTrue's transaction, so a duplicate phone aborts the
auth user too and no orphan can exist. Doing both would fail on every signup.

**The scoping fix.** The Laravel app lets any teacher read or mutate any student by id
(`StudentController::edit/update/follow/addPoints/...` have no ownership check). That
is closed here by RLS, and `supabase/test/01_rls_test.sql` asserts it stays closed.

**Attendance and points are atomic.** `save_attendance_batch()` does the whole class in
one transaction, computing the penalty diff against the previously stored status so
re-submitting a day does not double-charge. `adjust_student_points()` applies
`greatest(0, points + delta)` in a single statement rather than read-modify-write.

## Deliberately preserved quirks

These look like bugs and are kept on purpose, because changing them would silently
rewrite existing scores:

- **Points clamp is lossy.** `max(0, points + old − new)` means a student on 3 points
  marked unexcused-absent floors at 0, and correcting it back to present refunds the
  full 10 — ending *above* where they started.
- **Score scales disagree.** Memorization validates `0–100`, big review `0–10`, and the
  pass threshold is `6`.
- An out-of-range `from_ayah` is clamped to the surah's last ayah rather than
  discarded, so a bogus log counts as 1 memorized ayah.

## Intentional changes from the Laravel app

- The teacher dashboard's present/absent/late counters are **dropped**. They were
  computed mosque-wide across all teachers and never rendered in the Blade markup.
- `/student/{id}/progress` is **dropped** — its view never existed, so the route 500s
  in the Laravel app today.
- `welcome.blade.php` (unused Laravel starter) and `public/css/follow.css` (referenced
  by no view) are not ported.
- The admin dashboard no longer runs one progress query per student; it fetches all
  memorization logs once and groups them in TypeScript.
- Reordering a schedule item is a single `move_schedule_item()` transaction rather than
  two separate updates that could collide.
- The student-transfer form disables its submit button instead of interrupting with an
  `alert()`.
- Surah and parent pickers support Arabic search that folds alef/hamza/taa-marbuta
  variants, so typing `ال عمران` finds `آل عمران`.
