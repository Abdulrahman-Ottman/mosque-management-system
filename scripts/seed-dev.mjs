/**
 * Optional sample data, so the teacher dashboard has something to show before the
 * student-creation page exists. Idempotent - safe to re-run.
 *
 *   npm run db:seed
 *
 * (supabase/05_dev_seed.sql does the same thing if you'd rather paste SQL.)
 */
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data: users } = await db.from('users').select('id, phone, role');
const teacher = users?.find((u) => u.phone === '0900000001' && u.role === 'teacher');
const parent = users?.find((u) => u.phone === '0900000002' && u.role === 'parent');

if (!teacher || !parent) {
  console.error('Need a teacher (0900000001) and a parent (0900000002) first.');
  console.error('Create them with: npm run user:create -- "<name>" <phone> <role> <password>');
  process.exit(1);
}

const STUDENTS = [
  { name: 'أحمد محمد', grade: 'الصف السادس', address: 'حي الزهراء', points: 50 },
  { name: 'عبد الله خالد', grade: 'الصف الخامس', address: 'حي النصر', points: 35 },
  { name: 'يوسف إبراهيم', grade: 'الصف السابع', address: 'حي الزهراء', points: 60 },
  { name: 'معاذ سليم', grade: 'الصف الرابع', address: 'حي القدس', points: 20 },
];

const { data: existing } = await db.from('students').select('name').eq('user_id', teacher.id);
const have = new Set((existing ?? []).map((s) => s.name));
const toInsert = STUDENTS.filter((s) => !have.has(s.name)).map((s) => ({
  ...s, user_id: teacher.id, parent_id: parent.id,
}));

if (toInsert.length) {
  const { error } = await db.from('students').insert(toInsert);
  if (error) { console.error(`Students failed: ${error.message}`); process.exit(1); }
}
console.log(`Students: ${have.size + toInsert.length} (${toInsert.length} added)`);

// A simple programme on every day, so "برنامج اليوم" is never empty.
const { count } = await db.from('schedule_items').select('*', { count: 'exact', head: true });
if (!count) {
  const items = [];
  for (let day = 0; day <= 6; day++) {
    ['تسميع الحفظ الجديد', 'المراجعة اليومية', 'درس التجويد'].forEach((content, i) =>
      items.push({ day_of_week: day, content, sort_order: i + 1 }),
    );
  }
  const { error } = await db.from('schedule_items').insert(items);
  if (error) { console.error(`Schedule failed: ${error.message}`); process.exit(1); }
  console.log(`Schedule: ${items.length} items added`);
} else {
  console.log(`Schedule: ${count} items already present`);
}
