-- =============================================================================
-- OPTIONAL dev seed - sample students so the teacher dashboard has something to
-- show before the student-creation page exists.
--
-- Run this AFTER creating the users in the Supabase dashboard (Authentication ->
-- Users -> Add user). It looks them up by phone, so it does not care what UUIDs
-- they were given.
--
-- Expects these two accounts to exist:
--   teacher  phone 0900000001
--   parent   phone 0900000002
--
-- Safe to re-run: it will not duplicate students that already exist by name.
-- =============================================================================

do $seed$
declare
    v_teacher uuid;
    v_parent  uuid;
begin
    select id into v_teacher from public.users where phone = '0900000001' and role = 'teacher';
    select id into v_parent  from public.users where phone = '0900000002' and role = 'parent';

    if v_teacher is null then
        raise exception 'No teacher with phone 0900000001. Create it in Authentication -> Users first.';
    end if;

    if v_parent is null then
        raise exception 'No parent with phone 0900000002. Create it in Authentication -> Users first.';
    end if;

    insert into public.students (user_id, parent_id, name, grade, address, points)
    select v_teacher, v_parent, s.name, s.grade, s.address, s.points
      from (values
            ('أحمد محمد',      'الصف السادس', 'حي الزهراء', 50),
            ('عبد الله خالد',  'الصف الخامس', 'حي النصر',   35),
            ('يوسف إبراهيم',   'الصف السابع', 'حي الزهراء', 60),
            ('معاذ سليم',      'الصف الرابع', 'حي القدس',   20)
      ) as s(name, grade, address, points)
     where not exists (
            select 1 from public.students existing
             where existing.user_id = v_teacher and existing.name = s.name
     );

    raise notice 'Seeded students for teacher %; total now %',
        v_teacher, (select count(*) from public.students where user_id = v_teacher);
end
$seed$;

-- A couple of schedule items, so "برنامج اليوم" is not empty on every day.
insert into public.schedule_items (day_of_week, content, sort_order)
select d.day, c.content, c.ord
  from generate_series(0, 6) as d(day)
 cross join (values
        ('تسميع الحفظ الجديد', 1),
        ('المراجعة اليومية',   2),
        ('درس التجويد',        3)
 ) as c(content, ord)
 where not exists (select 1 from public.schedule_items where day_of_week = d.day);
