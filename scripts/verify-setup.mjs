/**
 * Checks that a Supabase project has been set up correctly: schema applied,
 * surahs seeded, functions installed, RLS actually enforcing.
 *
 * Run with:  npm run db:verify
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m, hint) => { failures++; console.log(`  FAIL  ${m}`); if (hint) console.log(`        -> ${hint}`); };

if (!url || !publishable || !secret) {
  console.error('Missing env vars. Fill in .env.local first.');
  process.exit(1);
}
if (!secret.startsWith('sb_secret_') && !secret.startsWith('eyJ')) {
  console.error('SUPABASE_SECRET_KEY does not look like a secret key.');
  console.error('It should start with sb_secret_ (or be the legacy service_role JWT).');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const anon = createClient(url, publishable, { auth: { persistSession: false } });

console.log('\nTables');
const TABLES = ['users', 'students', 'progress_logs', 'attendance_logs', 'activities', 'schedule_items', 'surahs'];
for (const t of TABLES) {
  const { error } = await admin.from(t).select('*', { count: 'exact', head: true });
  if (error) bad(`${t} — ${error.message}`, 'Re-run supabase/01_schema.sql');
  else ok(t);
}

console.log('\nReference data');
{
  const { data, error } = await admin.from('surahs').select('number, ayahs');
  if (error) bad(`surahs — ${error.message}`);
  else if (data.length !== 114) bad(`surahs has ${data.length} rows, expected 114`, 'Re-run supabase/04_seed_surahs.sql');
  else {
    const total = data.reduce((s, r) => s + r.ayahs, 0);
    if (total === 6236) ok('114 surahs, 6236 ayahs');
    else bad(`ayah total is ${total}, expected 6236`);
  }
}

console.log('\nFunctions');
for (const [fn, args] of [
  ['penalty_for', { p_status: 'غياب بدون عذر' }],
  ['app_role', {}],
]) {
  const { error } = await admin.rpc(fn, args);
  if (error) bad(`${fn}() — ${error.message}`, 'Re-run supabase/03_functions.sql');
  else ok(`${fn}()`);
}
{
  const { data, error } = await admin.rpc('penalty_for', { p_status: 'غياب بدون عذر' });
  if (!error) {
    if (data === 10) ok('penalty_for(unexcused) = 10');
    else bad(`penalty_for returned ${data}, expected 10`);
  }
}

console.log('\nAuth trigger');
{
  const { data: t } = await admin.rpc('penalty_for', { p_status: 'حاضر' });
  void t;
  const { data, error } = await admin.from('users').select('id, name, phone, role');
  if (error) bad(`could not read users — ${error.message}`);
  else if (data.length === 0) bad('no users yet', 'Create them in Authentication > Users (step 4)');
  else {
    ok(`${data.length} user(s): ${data.map((u) => `${u.phone}/${u.role}`).join(', ')}`);
    const bare = data.filter((u) => !u.phone || !u.name);
    if (bare.length) bad(`${bare.length} user(s) missing name/phone`, 'User Metadata JSON was empty or malformed when created');
  }
}

console.log('\nRLS (signed out must see nothing)');
for (const t of ['students', 'users', 'attendance_logs']) {
  const { data, error } = await anon.from(t).select('*').limit(1);
  if (error) ok(`${t} blocked (${error.code ?? 'error'})`);
  else if (data.length === 0) ok(`${t} returned 0 rows`);
  else bad(`${t} leaked ${data.length} row(s) to an anonymous client`, 'Re-run supabase/02_policies.sql');
}

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
