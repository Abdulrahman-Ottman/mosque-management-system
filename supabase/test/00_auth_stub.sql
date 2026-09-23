-- =============================================================================
-- TEST HARNESS ONLY - not part of the deployed schema.
--
-- Supabase provides the `auth` schema, auth.users, auth.uid() and auth.jwt().
-- This stubs just enough of them to run 01/02/03/04 unmodified against a plain
-- Postgres container, so the schema, the RLS policies and the mutation functions
-- can be exercised for real before any of it touches a Supabase project.
--
-- auth.uid() reads a session GUC, which lets a test "log in" as a given user with
--     set local request.jwt.claim.sub = '<uuid>';
-- =============================================================================

create schema if not exists auth;

create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              varchar(255) unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $fn$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $fn$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$fn$;

-- Supabase's `authenticated` role, which every policy is granted TO.
do $roles$
begin
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
    end if;
end
$roles$;

grant usage on schema public, auth to authenticated, anon;
