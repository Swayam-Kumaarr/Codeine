-- Per-topic completion tracking for preset roadmaps
create table public.roadmap_topic_progress (
  user_id uuid references public.profiles(id) on delete cascade not null,
  roadmap_id text not null,
  topic_number int not null,
  tick_count int not null default 1 check (tick_count between 1 and 2),
  completed_at timestamptz not null default now(),
  revised_at timestamptz,
  primary key (user_id, roadmap_id, topic_number)
);
alter table public.roadmap_topic_progress enable row level security;
create policy "Users own their roadmap_topic_progress" on public.roadmap_topic_progress
  for all using (auth.uid() = user_id);
