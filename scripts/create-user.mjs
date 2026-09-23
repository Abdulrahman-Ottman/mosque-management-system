/**
 * Creates a login account.
 *
 * Supabase Auth is email-based, so the phone is mapped to a synthetic
 * <phone>@mosque.invalid address - exactly what the login form does. The
 * on_auth_user_created trigger then creates the matching public.users row, so this
 * script deliberately does NOT insert into public.users itself.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-user.mjs <name> <phone> <role> <password>
 *
 * Example:
 *   node --env-file=.env.local scripts/create-user.mjs "مدير النظام" 0900000000 admin admin1234
 */
import { createClient } from '@supabase/supabase-js';

const [name, phoneRaw, role, password] = process.argv.slice(2);

if (!name || !phoneRaw || !role || !password) {
  console.error('Usage: node --env-file=.env.local scripts/create-user.mjs <name> <phone> <role> <password>');
  process.exit(1);
}
if (!['admin', 'teacher', 'parent'].includes(role)) {
  console.error(`Invalid role "${role}". Must be admin, teacher or parent.`);
  process.exit(1);
}

// Must match src/lib/phone.ts exactly, or an account created here cannot be
// logged into from the app.
function normalizePhone(input) {
  let out = '';
  for (const ch of input) {
    const c = ch.codePointAt(0);
    if (c >= 0x0660 && c <= 0x0669) out += String(c - 0x0660);
    else if (c >= 0x06f0 && c <= 0x06f9) out += String(c - 0x06f0);
    else if (ch >= '0' && ch <= '9') out += ch;
  }
  if (out.startsWith('00')) out = out.slice(2);
  return out;
}

const phone = normalizePhone(phoneRaw);
const email = `${phone}@mosque.invalid`;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, phone, role },
  app_metadata: { app_role: role },
});

if (error) {
  console.error(`FAILED: ${error.message}`);
  if (/already/i.test(error.message)) console.error('An account with this phone already exists.');
  if (/Database error/i.test(error.message)) {
    console.error('The trigger rejected it - most likely that phone is already taken.');
  }
  process.exit(1);
}

// Confirm the trigger actually produced the profile row.
const { data: profile } = await admin
  .from('users').select('name, phone, role').eq('id', data.user.id).single();

if (!profile) {
  console.error('Auth user created but public.users row is missing - is 03_functions.sql applied?');
  process.exit(1);
}

console.log(`Created ${profile.role}: ${profile.name}`);
console.log(`  login phone : ${profile.phone}`);
console.log(`  password    : ${password}`);
