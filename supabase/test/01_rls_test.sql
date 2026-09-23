-- =============================================================================
-- TEST HARNESS ONLY.
--
-- Proves the scoping fix actually bites. The Laravel app lets any teacher read or
-- mutate any student by id; these assertions fail loudly if that ever becomes true
-- again here.
--
-- Each check raises an exception on failure, so `psql -v ON_ERROR_STOP=1` turns the
-- whole file into a pass/fail gate.
-- =============================================================================

-- Supabase grants these to `authenticated` by default; the stub must match, and RLS
-- is bypassed for a table's owner so the tests must run as a non-owner role.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

\set teacher_a '11111111-1111-1111-1111-111111111111'
\set teacher_b '22222222-2222-2222-2222-222222222222'
\set parent_p  '33333333-3333-3333-3333-333333333333'
\set admin_x   '44444444-4444-4444-4444-444444444444'

-- Creating the auth user fires handle_new_auth_user(), which creates public.users.
insert into auth.users (id, email, raw_user_meta_data) values
  (:'teacher_a', '0900000001@mosque.invalid', '{"name":"الأستاذ أ","phone":"0900000001","role":"teacher"}'),
  (:'teacher_b', '0900000002@mosque.invalid', '{"name":"الأستاذ ب","phone":"0900000002","role":"teacher"}'),
  (:'parent_p',  '0900000003@mosque.invalid', '{"name":"ولي الأمر","phone":"0900000003","role":"parent"}'),
  (:'admin_x',   '0900000004@mosque.invalid', '{"name":"المدير","phone":"0900000004","role":"admin"}');

do $t$
begin
    if (select count(*) from public.users) <> 4 then
        raise exception 'FAIL: the auth.users trigger did not create public.users rows';
    end if;
    if (select role from public.users where id = '44444444-4444-4444-4444-444444444444') <> 'admin' then
        raise exception 'FAIL: role was not carried across from raw_user_meta_data';
    end if;
    raise notice 'PASS: auth.users trigger creates public.users with the right role';
end
$t$;

-- The trigger is the only path, so a duplicate phone must abort the auth user too.
do $t$
begin
    begin
        insert into auth.users (id, email, raw_user_meta_data)
        values (gen_random_uuid(), 'dup@mosque.invalid',
                '{"name":"مكرر","phone":"0900000001","role":"teacher"}');
        raise exception 'FAIL: duplicate phone was accepted';
    exception when unique_violation then
        raise notice 'PASS: duplicate phone is rejected at the database level';
    end;
end
$t$;

insert into public.students (id, user_id, parent_id, name, points) overriding system value values
  (1, '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'طالب الأستاذ أ', 50),
  (2, '22222222-2222-2222-2222-222222222222', null, 'طالب الأستاذ ب', 50);

-- =============================================================================
-- RLS: teacher isolation
-- =============================================================================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $t$
declare v_count integer; v_other integer;
begin
    select count(*) into v_count from public.students;
    if v_count <> 1 then
        raise exception 'FAIL: teacher A sees % students, expected only their own 1', v_count;
    end if;

    -- The exact hole in StudentController::edit/follow/addPoints today.
    select count(*) into v_other from public.students where id = 2;
    if v_other <> 0 then
        raise exception 'FAIL: teacher A can read teacher B''s student by id';
    end if;

    raise notice 'PASS: teacher A sees only their own students, and cannot fetch B''s by id';
end
$t$;

-- Writing a progress log against another teacher's student must be blocked.
do $t$
begin
    begin
        insert into public.progress_logs (student_id, type, surah, surah_number, from_ayah, to_ayah)
        values (2, 'memorization', 'الفاتحة', 1, 1, 7);
        raise exception 'FAIL: teacher A wrote a progress log for teacher B''s student';
    exception when insufficient_privilege then
        raise notice 'PASS: cross-teacher progress log insert is blocked by RLS';
    end;
end
$t$;

-- Adjusting another teacher's student's points must be blocked.
do $t$
begin
    begin
        perform public.adjust_student_points(2, 100);
        raise exception 'FAIL: teacher A adjusted points on teacher B''s student';
    exception when no_data_found then
        raise notice 'PASS: cross-teacher points adjustment is blocked by RLS';
    end;
end
$t$;

-- =============================================================================
-- Points: floor at zero, no ceiling
-- =============================================================================
do $t$
declare v integer;
begin
    v := public.adjust_student_points(1, 25);
    if v <> 75 then raise exception 'FAIL: expected 75 after +25, got %', v; end if;

    v := public.adjust_student_points(1, -1000);
    if v <> 0 then raise exception 'FAIL: points must floor at 0, got %', v; end if;

    perform public.adjust_student_points(1, 50);
    raise notice 'PASS: points add, subtract and floor at zero';
end
$t$;

-- =============================================================================
-- save_attendance_batch: the penalty diff must be idempotent
-- =============================================================================
do $t$
declare v_points integer; v_reason text; v_rows integer;
begin
    -- Charge an unexcused absence: 50 -> 40.
    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"غياب بدون عذر"}]'::jsonb);
    select points into v_points from public.students where id = 1;
    if v_points <> 40 then raise exception 'FAIL: expected 40 after an unexcused absence, got %', v_points; end if;

    -- Re-submitting the SAME day unchanged must not charge again. This is the whole
    -- reason the penalty diff exists.
    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"غياب بدون عذر"}]'::jsonb);
    select points into v_points from public.students where id = 1;
    if v_points <> 40 then raise exception 'FAIL: re-submitting double-charged, got %', v_points; end if;
    raise notice 'PASS: re-submitting the same attendance is idempotent';

    -- Correcting it to present refunds the 10.
    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"حاضر"}]'::jsonb);
    select points into v_points from public.students where id = 1;
    if v_points <> 50 then raise exception 'FAIL: expected a refund to 50, got %', v_points; end if;

    -- Late costs 5.
    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"متأخر"}]'::jsonb);
    select points into v_points from public.students where id = 1;
    if v_points <> 45 then raise exception 'FAIL: expected 45 after late, got %', v_points; end if;
    raise notice 'PASS: corrections refund and re-charge correctly';

    -- One row per student per day, no duplicates.
    select count(*) into v_rows from public.attendance_logs where student_id = 1 and date = '2026-09-05';
    if v_rows <> 1 then raise exception 'FAIL: expected exactly 1 attendance row, got %', v_rows; end if;

    -- absence_reason is kept only for غياب بعذر.
    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"غياب بعذر","absence_reason":"مريض"}]'::jsonb);
    select absence_reason into v_reason from public.attendance_logs where student_id = 1 and date = '2026-09-05';
    if v_reason <> 'مريض' then raise exception 'FAIL: excused reason not stored, got %', v_reason; end if;

    perform public.save_attendance_batch(date '2026-09-05',
        '[{"student_id":1,"status":"حاضر","absence_reason":"مريض"}]'::jsonb);
    select absence_reason into v_reason from public.attendance_logs where student_id = 1 and date = '2026-09-05';
    if v_reason is not null then raise exception 'FAIL: reason should be cleared when not excused, got %', v_reason; end if;
    raise notice 'PASS: absence_reason is stored only for an excused absence';
end
$t$;

-- Attendance for another teacher's student must be blocked, not silently written.
do $t$
begin
    begin
        perform public.save_attendance_batch(date '2026-09-05',
            '[{"student_id":2,"status":"حاضر"}]'::jsonb);
        if exists (select 1 from public.attendance_logs where student_id = 2) then
            raise exception 'FAIL: teacher A recorded attendance for teacher B''s student';
        end if;
        raise notice 'PASS: cross-teacher attendance write stored nothing';
    exception when insufficient_privilege then
        raise notice 'PASS: cross-teacher attendance write is blocked by RLS';
    end;
end
$t$;

-- =============================================================================
-- Parent: read-only access to their own children
-- =============================================================================
reset role;
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

do $t$
declare v_count integer;
begin
    select count(*) into v_count from public.students;
    if v_count <> 1 then raise exception 'FAIL: parent sees % students, expected 1 child', v_count; end if;

    begin
        update public.students set points = 9999 where id = 1;
        if (select points from public.students where id = 1) = 9999 then
            raise exception 'FAIL: parent was able to modify their child';
        end if;
        raise notice 'PASS: parent update affected no rows (read-only)';
    exception when insufficient_privilege then
        raise notice 'PASS: parent write is blocked by RLS';
    end;
end
$t$;

-- =============================================================================
-- Admin: sees everything
-- =============================================================================
reset role;
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

do $t$
declare v_count integer;
begin
    select count(*) into v_count from public.students;
    if v_count <> 2 then raise exception 'FAIL: admin sees % students, expected all 2', v_count; end if;
    raise notice 'PASS: admin sees all students';
end
$t$;

-- =============================================================================
-- Teacher deletion is RESTRICTed while they still hold students
-- =============================================================================
reset role;

do $t$
begin
    begin
        delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
        raise exception 'FAIL: deleting a teacher with students was allowed';
    exception when foreign_key_violation then
        raise notice 'PASS: deleting a teacher who still has students is RESTRICTed';
    end;
end
$t$;

-- Deleting a parent nulls the link instead, leaving the child in place.
do $t$
begin
    delete from auth.users where id = '33333333-3333-3333-3333-333333333333';
    if (select parent_id from public.students where id = 1) is not null then
        raise exception 'FAIL: parent_id should have been set to null';
    end if;
    if not exists (select 1 from public.students where id = 1) then
        raise exception 'FAIL: deleting a parent must not delete the child';
    end if;
    raise notice 'PASS: deleting a parent nulls parent_id and keeps the student';
end
$t$;

\echo ''
\echo '================================'
\echo ' ALL RLS / LOGIC CHECKS PASSED'
\echo '================================'
