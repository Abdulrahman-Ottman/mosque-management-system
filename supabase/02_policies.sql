-- =============================================================================
-- Row Level Security.
--
-- This is where the Laravel app's known scoping holes get closed. Today
-- StudentController::edit/update/follow/storeFollow/storeReview/addPoints/
-- subtractPoints and DashboardController::storeAttendance all fetch by id with no
-- ownership check, so any teacher can read or mutate any student. These policies
-- make that impossible at the database level, regardless of application bugs.
--
-- Two performance rules are applied throughout:
--   1. auth.uid() and app_role() are wrapped in a subselect, so the planner hoists
--      them to an InitPlan instead of re-evaluating per row.
--   2. Every column referenced below is indexed in 01_schema.sql.
-- =============================================================================

alter table public.users           enable row level security;
alter table public.students        enable row level security;
alter table public.progress_logs   enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.activities      enable row level security;
alter table public.schedule_items  enable row level security;
alter table public.surahs          enable row level security;

-- -----------------------------------------------------------------------------
-- app_role()
--
-- Reads the role from public.users, NOT from the JWT. A JWT claim would be faster
-- but is wrong for authorization: app_metadata changes do not propagate into an
-- already-issued access token, so demoting an admin would leave them with admin
-- privileges until their token expired (up to an hour by default). The table read
-- is a single indexed lookup, hoisted once per statement.
--
-- SECURITY DEFINER is what prevents infinite recursion when this is called from a
-- policy ON public.users: RLS is not enforced for a table's owner. That makes it
-- fragile - it will break if anyone runs
--     ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
-- so leave this comment in place.
-- -----------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
    select role from public.users where id = (select auth.uid());
$fn$;

revoke execute on function public.app_role() from public, anon;
grant execute on function public.app_role() to authenticated;

comment on function public.app_role() is
  'Current user''s role, read from public.users (never the JWT, which goes stale). '
  'SECURITY DEFINER is required to avoid RLS recursion in policies on public.users.';

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
create policy users_select_self on public.users
    for select to authenticated
    using (id = (select auth.uid()) or (select public.app_role()) = 'admin');

create policy users_admin_write on public.users
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

-- Teachers must be able to read the parent list to populate the parent picker,
-- and a parent's name is shown on the teacher's student cards.
create policy users_teacher_reads_parents on public.users
    for select to authenticated
    using ((select public.app_role()) = 'teacher' and role = 'parent');

-- -----------------------------------------------------------------------------
-- students
--   teacher -> full access to their own students (students.user_id)
--   parent  -> read-only access to their children (students.parent_id)
--   admin   -> everything
-- -----------------------------------------------------------------------------
create policy students_teacher_all on public.students
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy students_parent_read on public.students
    for select to authenticated
    using (parent_id = (select auth.uid()));

create policy students_admin_all on public.students
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

-- -----------------------------------------------------------------------------
-- progress_logs / attendance_logs
--
-- Reached through the owning student. The WITH CHECK on insert/update is what stops
-- a teacher writing a log against a student they do not own - the exact hole in
-- StudentController::storeFollow today.
-- -----------------------------------------------------------------------------
create policy progress_logs_teacher_all on public.progress_logs
    for all to authenticated
    using (exists (select 1 from public.students s
                   where s.id = student_id and s.user_id = (select auth.uid())))
    with check (exists (select 1 from public.students s
                        where s.id = student_id and s.user_id = (select auth.uid())));

create policy progress_logs_parent_read on public.progress_logs
    for select to authenticated
    using (exists (select 1 from public.students s
                   where s.id = student_id and s.parent_id = (select auth.uid())));

create policy progress_logs_admin_all on public.progress_logs
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

create policy attendance_logs_teacher_all on public.attendance_logs
    for all to authenticated
    using (exists (select 1 from public.students s
                   where s.id = student_id and s.user_id = (select auth.uid())))
    with check (exists (select 1 from public.students s
                        where s.id = student_id and s.user_id = (select auth.uid())));

create policy attendance_logs_parent_read on public.attendance_logs
    for select to authenticated
    using (exists (select 1 from public.students s
                   where s.id = student_id and s.parent_id = (select auth.uid())));

create policy attendance_logs_admin_all on public.attendance_logs
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

-- -----------------------------------------------------------------------------
-- activities - admin-managed
-- -----------------------------------------------------------------------------
create policy activities_admin_all on public.activities
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

-- -----------------------------------------------------------------------------
-- schedule_items - admin writes; everyone signed in reads, because the teacher and
-- parent dashboards both render "today's programme".
-- -----------------------------------------------------------------------------
create policy schedule_items_read_all on public.schedule_items
    for select to authenticated
    using (true);

create policy schedule_items_admin_write on public.schedule_items
    for all to authenticated
    using ((select public.app_role()) = 'admin')
    with check ((select public.app_role()) = 'admin');

-- -----------------------------------------------------------------------------
-- surahs - immutable reference data, readable by all signed-in users.
-- -----------------------------------------------------------------------------
create policy surahs_read_all on public.surahs
    for select to authenticated
    using (true);
