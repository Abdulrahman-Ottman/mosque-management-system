/**
 * Clears operational data, keeping only what the app needs to function.
 *
 *   KEPT     surahs (reference data), and every admin account
 *   DELETED  students, progress logs, attendance logs, activities,
 *            schedule items, and all teacher/parent accounts
 *
 * Intended for taking a project that has been used for testing and handing it over
 * clean. It is destructive and irreversible, so it refuses to run without --yes.
 *
 *   node --env-file=.env.local scripts/reset-data.mjs          # dry run
 *   node --env-file=.env.local scripts/reset-data.mjs --yes    # actually delete
 */
import { createClient } from '@supabase/supabase-js';

const CONFIRMED = process.argv.includes('--yes');

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const count = async (t) => (await db.from(t).select('*', { count: 'exact', head: true })).count ?? 0;

async function report(label) {
  const { data: users } = await db.from('users').select('role');
  const byRole = {};
  for (const u of users ?? []) byRole[u.role] = (byRole[u.role] ?? 0) + 1;

  console.log(`\n${label}`);
  console.log(`  surahs          ${await count('surahs')}   (reference data - kept)`);
  console.log(`  students        ${await count('students')}`);
  console.log(`  progress_logs   ${await count('progress_logs')}`);
  console.log(`  attendance_logs ${await count('attendance_logs')}`);
  console.log(`  activities      ${await count('activities')}`);
  console.log(`  schedule_items  ${await count('schedule_items')}`);
  console.log(
    `  users           admin=${byRole.admin ?? 0} teacher=${byRole.teacher ?? 0} parent=${byRole.parent ?? 0}`,
  );
}

await report('BEFORE');

if (!CONFIRMED) {
  console.log('\nDry run. Nothing was deleted.');
  console.log('Re-run with --yes to apply.\n');
  process.exit(0);
}

console.log('\nDeleting...');

// Order matters. students.user_id is ON DELETE RESTRICT, so every student must be
// gone before the teachers who own them can be removed. The log tables would cascade
// from students anyway, but deleting them explicitly keeps the intent obvious.
for (const table of ['attendance_logs', 'progress_logs']) {
  const { error } = await db.from(table).delete().gt('id', 0);
  if (error) {
    console.error(`  FAILED ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  cleared ${table}`);
}

for (const table of ['students', 'activities', 'schedule_items']) {
  const { error } = await db.from(table).delete().gt('id', 0);
  if (error) {
    console.error(`  FAILED ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  cleared ${table}`);
}

// Accounts go through the Admin API, not a table delete: the auth user is the source
// of truth and public.users is removed by its ON DELETE CASCADE.
const { data: toRemove } = await db.from('users').select('id, name, phone, role').neq('role', 'admin');

for (const user of toRemove ?? []) {
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`  FAILED ${user.role} ${user.phone}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  removed ${user.role} ${user.phone} (${user.name})`);
}

await report('AFTER');

const remaining = await count('surahs');
if (remaining !== 114) {
  console.error(`\nWARNING: surahs table has ${remaining} rows, expected 114.`);
  console.error('Re-run supabase/04_seed_surahs.sql.\n');
  process.exit(1);
}

console.log('\nDone. The database holds the admin account and the 114 surahs.\n');
