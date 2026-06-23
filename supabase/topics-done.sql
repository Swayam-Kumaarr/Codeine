-- Run in Supabase SQL editor
alter table public.subjects
  add column if not exists topics_done jsonb not null default '[]';
