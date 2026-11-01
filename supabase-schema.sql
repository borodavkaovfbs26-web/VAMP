
-- VAMP platform schema. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role text not null default 'pending' check (role in ('admin','teacher','student','pending')),
 age int check (age between 4 and 100),
 phone text,
 level text not null default 'A1' check(level in ('A1','A2','B1','B2','C1')),
 created_at timestamptz not null default now()
);
-- Upgrade columns for an existing early VAMP database
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists level text not null default 'A1';
create table if not exists public.lessons (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 title text not null default 'Урок англійської',
 starts_at timestamptz not null,
 duration_minutes int not null default 50,
 status text not null default 'scheduled',
 created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 teacher_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 description text,
 due_date date,
 status text not null default 'new',
 created_at timestamptz not null default now()
);
alter table public.tasks add column if not exists teacher_id uuid references public.profiles(id) on delete cascade;
alter table public.tasks add column if not exists status text not null default 'new';
create table if not exists public.task_submissions (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 answer text not null default '',
 status text not null default 'submitted',
 teacher_comment text,
 grade numeric(5,2),
 created_at timestamptz not null default now(),
 unique(task_id,student_id)
);
create table if not exists public.dictionary (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 word text not null,
 translation text not null,
 example text,
 created_at timestamptz not null default now()
);
create table if not exists public.lesson_progress (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 lesson_key text not null,
 score int not null default 0,
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 unique(user_id,lesson_key)
);
create table if not exists public.lesson_requests (
 id uuid primary key default gen_random_uuid(),
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 requester_id uuid not null references public.profiles(id) on delete cascade,
 reason text,
 status text not null default 'pending',
 created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 sender_name text,
 body text not null,
 created_at timestamptz not null default now()
);
create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$
 select role from public.profiles where id=auth.uid()
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(public.current_role()='admin',false)
$$;
create or replace function public.is_teacher_for(p_student uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.lessons where student_id=p_student and teacher_id=auth.uid())
$$;
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.dictionary enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_requests enable row level security;
alter table public.messages enable row level security;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name,age,phone,level) on public.profiles to authenticated;
grant select,insert,update,delete on public.lessons,public.tasks,public.task_submissions,public.dictionary,public.lesson_progress,public.lesson_requests,public.messages to authenticated;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin() or public.is_teacher_for(id));
drop policy if exists "profile update" on public.profiles;
create policy "profile update" on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
drop policy if exists "lessons read" on public.lessons;
create policy "lessons read" on public.lessons for select to authenticated using(student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());
drop policy if exists "lessons admin insert" on public.lessons;
create policy "lessons admin insert" on public.lessons for insert to authenticated with check(public.is_admin());
drop policy if exists "lessons update" on public.lessons;
create policy "lessons update" on public.lessons for update to authenticated using(public.is_admin() or teacher_id=auth.uid()) with check(public.is_admin() or teacher_id=auth.uid());
drop policy if exists "lessons admin delete" on public.lessons;
create policy "lessons admin delete" on public.lessons for delete to authenticated using(public.is_admin());
drop policy if exists "tasks read" on public.tasks;
create policy "tasks read" on public.tasks for select to authenticated using(student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());
drop policy if exists "tasks teacher insert" on public.tasks;
create policy "tasks teacher insert" on public.tasks for insert to authenticated with check((teacher_id=auth.uid() and public.current_role()='teacher') or public.is_admin());
drop policy if exists "tasks teacher update" on public.tasks;
create policy "tasks teacher update" on public.tasks for update to authenticated using(teacher_id=auth.uid() or public.is_admin()) with check(teacher_id=auth.uid() or public.is_admin());
drop policy if exists "tasks delete" on public.tasks;
create policy "tasks delete" on public.tasks for delete to authenticated using(teacher_id=auth.uid() or public.is_admin());
drop policy if exists "submissions read" on public.task_submissions;
create policy "submissions read" on public.task_submissions for select to authenticated using(student_id=auth.uid() or public.is_admin() or exists(select 1 from public.tasks t where t.id=task_id and t.teacher_id=auth.uid()));
drop policy if exists "submissions student insert" on public.task_submissions;
create policy "submissions student insert" on public.task_submissions for insert to authenticated with check(student_id=auth.uid());
drop policy if exists "submissions update" on public.task_submissions;
create policy "submissions update" on public.task_submissions for update to authenticated using(student_id=auth.uid() or public.is_admin() or exists(select 1 from public.tasks t where t.id=task_id and t.teacher_id=auth.uid())) with check(student_id=auth.uid() or public.is_admin() or exists(select 1 from public.tasks t where t.id=task_id and t.teacher_id=auth.uid()));
drop policy if exists "dictionary own" on public.dictionary;
create policy "dictionary own" on public.dictionary for all to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
drop policy if exists "progress own" on public.lesson_progress;
create policy "progress own" on public.lesson_progress for all to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
drop policy if exists "requests access" on public.lesson_requests;
create policy "requests access" on public.lesson_requests for select to authenticated using(requester_id=auth.uid() or public.is_admin());
drop policy if exists "requests insert" on public.lesson_requests;
create policy "requests insert" on public.lesson_requests for insert to authenticated with check(requester_id=auth.uid());
drop policy if exists "requests admin update" on public.lesson_requests;
create policy "requests admin update" on public.lesson_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "messages access" on public.messages;
create policy "messages access" on public.messages for select to authenticated using(sender_id=auth.uid() or receiver_id=auth.uid() or public.is_admin());
drop policy if exists "messages send" on public.messages;
create policy "messages send" on public.messages for insert to authenticated with check(sender_id=auth.uid());
-- After creating the first admin account in Supabase Authentication, run:
-- update public.profiles set role='admin' where id='AUTH_USER_UUID';
notify pgrst, 'reload schema';
