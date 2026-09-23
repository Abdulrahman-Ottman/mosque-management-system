-- =============================================================================
-- Mosque app - Postgres schema for Supabase.
-- Ported from the Laravel migrations (database/migrations) as a single squashed
-- definition. The MySQL-only "ALTER TABLE ... MODIFY ... ENUM(...)" migration is
-- folded in here; the legacy status value 'غائب' is deliberately absent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users
--
-- id mirrors auth.users(id) so RLS reduces to `user_id = auth.uid()`.
-- A single self-joined table serves all three roles: a teacher owns students via
-- students.user_id, a parent owns children via students.parent_id, an admin owns
-- neither.
-- -----------------------------------------------------------------------------
create table public.users (
    id          uuid primary key references auth.users (id) on delete cascade,
    name        varchar(255) not null,
    email       varchar(255) unique,
    -- The login identifier. Unique here, unlike the Laravel schema where it was
    -- only enforced by validation and Auth::attempt() silently took the first match.
    phone       varchar(255) not null unique,
    role        varchar(32)  not null default 'teacher'
                  check (role in ('admin', 'teacher', 'parent')),
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

-- -----------------------------------------------------------------------------
-- students
--
-- FK asymmetry is deliberate and mirrors the Laravel migrations:
--   user_id   -> RESTRICT  (migration 2026_09_05_000000 exists specifically to stop
--                           cascade-deleting a teacher's students and all their logs)
--   parent_id -> SET NULL  (removing a parent account orphans the link, not the child)
-- -----------------------------------------------------------------------------
create table public.students (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references public.users (id) on delete restrict,
    parent_id     uuid          references public.users (id) on delete set null,
    name          varchar(255) not null,
    phone_number  varchar(255),
    grade         varchar(255),
    address       varchar(255),
    points        integer      not null default 0 check (points >= 0),
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);

-- -----------------------------------------------------------------------------
-- progress_logs
--
-- One flat table for two log types distinguished by `type`; fields belonging to
-- the other type are simply left null. No STI, no polymorphism.
-- -----------------------------------------------------------------------------
create table public.progress_logs (
    id                   bigint generated always as identity primary key,
    student_id           bigint not null references public.students (id) on delete cascade,
    type                 varchar(32) not null check (type in ('memorization', 'big_review')),

    -- الحفظ الجديد
    surah                varchar(255),
    surah_number         smallint check (surah_number between 1 and 114),
    from_ayah            integer,
    to_ayah              integer,
    score                integer,
    homework             varchar(255),
    daily_review         varchar(255),
    review_score         integer,
    review_homework      varchar(255),
    notes                text,

    -- المراجعة الكبرى
    weekly_memorization  varchar(255),

    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- attendance_logs
--
-- The status values are the exact Arabic strings the app stores and compares
-- against. They must byte-match src/lib/attendance.ts - no normalisation, no
-- trailing whitespace. 'غائب' was data-migrated to 'غياب بدون عذر' and is gone.
-- -----------------------------------------------------------------------------
create table public.attendance_logs (
    id              bigint generated always as identity primary key,
    student_id      bigint not null references public.students (id) on delete cascade,
    status          varchar(32) not null
                      check (status in ('حاضر', 'غياب بعذر', 'غياب بدون عذر', 'متأخر')),
    absence_reason  varchar(255),
    date            date not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    -- The app has always treated this as one row per student per day, but no
    -- constraint enforced it. Required for "on conflict (student_id, date)".
    constraint attendance_logs_student_date_unique unique (student_id, date)
);

-- -----------------------------------------------------------------------------
-- activities - standalone mosque events, no FKs
-- -----------------------------------------------------------------------------
create table public.activities (
    id              bigint generated always as identity primary key,
    title           varchar(255) not null,
    description     text,
    date            date not null,
    students_count  integer not null default 0 check (students_count >= 0),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- schedule_items - the recurring weekly programme
-- day_of_week uses Carbon numbering: 0 = Sunday ... 6 = Saturday.
-- -----------------------------------------------------------------------------
create table public.schedule_items (
    id           bigint generated always as identity primary key,
    day_of_week  smallint not null check (day_of_week between 0 and 6),
    content      varchar(500) not null,
    sort_order   integer not null default 0,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- surahs - reference data, so SQL can join against it (and the progress query can
-- resolve the legacy `surah` name when surah_number is null). Seeded in 04_seed.sql.
-- -----------------------------------------------------------------------------
create table public.surahs (
    number  smallint primary key check (number between 1 and 114),
    name    varchar(64) not null unique,
    ayahs   smallint    not null check (ayahs > 0)
);

-- =============================================================================
-- Indexes
--
-- MySQL/InnoDB creates an index for every foreign key automatically. Postgres does
-- NOT. Without these, every RLS EXISTS(...) subquery and every list query would
-- sequentially scan - a silent, guaranteed performance regression.
-- =============================================================================
create index students_user_id_idx            on public.students (user_id);
create index students_parent_id_idx          on public.students (parent_id);
create index progress_logs_student_id_idx    on public.progress_logs (student_id);
create index progress_logs_student_type_idx  on public.progress_logs (student_id, type);
create index progress_logs_created_at_idx    on public.progress_logs (created_at desc);
create index attendance_logs_date_idx        on public.attendance_logs (date);
create index users_role_idx                  on public.users (role);
create index schedule_items_day_sort_idx     on public.schedule_items (day_of_week, sort_order);
create index activities_date_idx             on public.activities (date desc);

-- =============================================================================
-- updated_at maintenance (Laravel did this in the ORM; Postgres needs a trigger)
-- =============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
    new.updated_at := now();
    return new;
end;
$fn$;

create trigger users_touch           before update on public.users           for each row execute function public.touch_updated_at();
create trigger students_touch        before update on public.students        for each row execute function public.touch_updated_at();
create trigger progress_logs_touch   before update on public.progress_logs   for each row execute function public.touch_updated_at();
create trigger attendance_logs_touch before update on public.attendance_logs for each row execute function public.touch_updated_at();
create trigger activities_touch      before update on public.activities      for each row execute function public.touch_updated_at();
create trigger schedule_items_touch  before update on public.schedule_items  for each row execute function public.touch_updated_at();
