-- =============================================================================
-- Atomic mutations.
--
-- The Laravel originals are read-modify-write in PHP, which is racy and would cost
-- several network round-trips per student from a serverless function. More
-- importantly, `max(0, points + old - new)` is LOSSY and non-reversible, so a
-- partial failure mid-batch would corrupt points with no way to reconstruct them.
-- A function body is one transaction, so a failure rolls back cleanly.
--
-- All of these are SECURITY INVOKER (the default), so RLS still applies and the
-- ownership fix holds. A teacher touching a student they do not own gets filtered
-- by the SELECT policy and blocked by the INSERT WITH CHECK, raising 42501 and
-- rolling back the whole batch - which is the correct failure mode.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- penalty_for - single source of truth for the points penalty, mirroring
-- AttendanceLog::penaltyFor() and src/lib/attendance.ts.
-- -----------------------------------------------------------------------------
create or replace function public.penalty_for(p_status text)
returns integer
language sql
immutable
as $fn$
    select case p_status
        when 'غياب بدون عذر' then 10
        when 'متأخر'          then 5
        else 0
    end;
$fn$;

-- -----------------------------------------------------------------------------
-- adjust_student_points - replaces StudentController::addPoints/subtractPoints.
-- Preserves the floor at zero and the absence of any ceiling.
-- -----------------------------------------------------------------------------
create or replace function public.adjust_student_points(
    p_student_id bigint,
    p_delta      integer
)
returns integer
language plpgsql
as $fn$
declare
    v_points integer;
begin
    update public.students
       set points = greatest(0, points + p_delta)
     where id = p_student_id
    returning points into v_points;

    if not found then
        -- Either the student does not exist, or RLS filtered it out because the
        -- caller does not own them. Deliberately indistinguishable.
        raise exception 'student_not_found' using errcode = 'no_data_found';
    end if;

    return v_points;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- save_attendance_batch - replaces DashboardController::storeAttendance.
--
-- p_entries is a JSON array of { student_id, status, absence_reason }.
-- The date is passed in explicitly rather than using current_date, so the app's
-- timezone decision lives in one place (src/lib/arabic-date.ts) instead of being
-- silently hidden inside the database.
--
-- Set-based, in three statements rather than a row loop:
--   1. resolve the incoming rows and diff them against what is already stored
--   2. apply the points delta, but ONLY where it actually changed
--      (this reproduces PHP's `if ($oldPenalty !== $newPenalty)` exactly, which
--       is what makes re-submitting the same day idempotent)
--   3. upsert the attendance rows
-- -----------------------------------------------------------------------------
create or replace function public.save_attendance_batch(
    p_date    date,
    p_entries jsonb
)
returns integer
language plpgsql
as $fn$
declare
    v_count integer;
begin
    -- A single statement, so the points update and the attendance upsert cannot
    -- diverge. `deltas` reads attendance_logs as of the statement snapshot, i.e.
    -- the PREVIOUS status, which is exactly what the penalty diff needs.
    --
    -- Deliberately not a temporary table: one would persist to end-of-transaction
    -- and break a second call within the same transaction.
    with incoming as (
        select (e ->> 'student_id')::bigint      as student_id,
               e ->> 'status'                    as status,
               nullif(e ->> 'absence_reason', '') as absence_reason
          from jsonb_array_elements(p_entries) as e
    ),
    deltas as (
        select i.student_id,
               public.penalty_for(a.status) - public.penalty_for(i.status) as delta
          from incoming i
          left join public.attendance_logs a
                 on a.student_id = i.student_id
                and a.date = p_date
    ),
    -- Refund the old penalty, charge the new one, floor at zero. `delta <> 0` is
    -- the idempotency guard, reproducing PHP's `if ($oldPenalty !== $newPenalty)`.
    -- A data-modifying CTE always runs to completion even though nothing selects
    -- from it.
    bumped as (
        update public.students s
           set points = greatest(0, s.points + d.delta)
          from deltas d
         where s.id = d.student_id
           and d.delta <> 0
        returning s.id
    )
    insert into public.attendance_logs (student_id, status, absence_reason, date)
    select i.student_id,
           i.status,
           -- سبب الغياب يُحفظ فقط مع "غياب بعذر"
           case when i.status = 'غياب بعذر' then i.absence_reason else null end,
           p_date
      from incoming i
        on conflict (student_id, date)
        do update set status         = excluded.status,
                      absence_reason = excluded.absence_reason;

    get diagnostics v_count = row_count;
    return v_count;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- move_schedule_item - replaces ScheduleController::move.
--
-- The Laravel version swaps sort_order with two separate update statements, which
-- can collide under concurrent reordering. One transaction, one function.
-- -----------------------------------------------------------------------------
create or replace function public.move_schedule_item(
    p_id        bigint,
    p_direction text
)
returns void
language plpgsql
as $fn$
declare
    v_day        smallint;
    v_order      integer;
    v_neighbor   bigint;
    v_neighbor_o integer;
begin
    if p_direction not in ('up', 'down') then
        raise exception 'invalid_direction' using errcode = 'invalid_parameter_value';
    end if;

    select day_of_week, sort_order into v_day, v_order
      from public.schedule_items where id = p_id;

    if not found then
        raise exception 'item_not_found' using errcode = 'no_data_found';
    end if;

    if p_direction = 'up' then
        select id, sort_order into v_neighbor, v_neighbor_o
          from public.schedule_items
         where day_of_week = v_day and sort_order < v_order
         order by sort_order desc
         limit 1;
    else
        select id, sort_order into v_neighbor, v_neighbor_o
          from public.schedule_items
         where day_of_week = v_day and sort_order > v_order
         order by sort_order asc
         limit 1;
    end if;

    -- No neighbour means it is already at the end; the Laravel version is a no-op too.
    if v_neighbor is null then
        return;
    end if;

    update public.schedule_items set sort_order = v_neighbor_o where id = p_id;
    update public.schedule_items set sort_order = v_order      where id = v_neighbor;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- handle_new_auth_user - creates the public.users row inside GoTrue's own
-- transaction, so a failure (e.g. duplicate phone) aborts the auth user creation
-- too and no orphan can exist. This replaces app-side "create then compensate on
-- failure" logic.
--
-- IMPORTANT: because this trigger exists, the application must NOT also insert into
-- public.users after calling auth.admin.createUser() - that would raise a duplicate
-- key on every single signup. Exactly one path, and this is it.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
    insert into public.users (id, name, phone, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', ''),
        coalesce(new.raw_user_meta_data ->> 'phone', ''),
        coalesce(new.raw_user_meta_data ->> 'role', 'teacher')
    );
    return new;
end;
$fn$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();
