-- VAMP: базова схема бази даних Supabase
-- Запускай у Supabase → SQL Editor → New query.
-- Якщо таблиці вже існують, не запускай цей файл повторно без перевірки структури.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','teacher','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  due_date date,
  completed boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  grade numeric(4,2) not null check (grade >= 0 and grade <= 12),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.dictionary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text not null,
  example text,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  lesson_date date not null,
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now(),
  constraint schedule_time_check check (end_time > start_time)
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.grades enable row level security;
alter table public.dictionary enable row level security;
alter table public.schedule enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.grades to authenticated;
grant select, insert, update, delete on public.dictionary to authenticated;
grant select on public.schedule to authenticated;

drop policy if exists "Profiles: own record" on public.profiles;
create policy "Profiles: own record" on public.profiles for all to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Tasks: own records" on public.tasks;
create policy "Tasks: own records" on public.tasks for all to authenticated
using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "Grades: own records" on public.grades;
create policy "Grades: own records" on public.grades for select to authenticated
using (auth.uid() = student_id);

drop policy if exists "Dictionary: own records" on public.dictionary;
create policy "Dictionary: own records" on public.dictionary for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Schedule: own records" on public.schedule;
create policy "Schedule: own records" on public.schedule for select to authenticated
using (auth.uid() = student_id);

-- Оновити кеш схеми PostgREST
notify pgrst, 'reload schema';
