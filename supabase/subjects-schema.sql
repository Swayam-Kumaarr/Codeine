-- Run this in Supabase SQL editor after schema.sql

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  code text not null default '',
  color text not null default '#3D1F8A',
  bg_color text not null default '#EDE8F7',
  topics jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create policy "Users own their subjects" on public.subjects for all using (auth.uid() = user_id);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.homework enable row level security;
create policy "Users own their homework" on public.homework for all using (auth.uid() = user_id);
