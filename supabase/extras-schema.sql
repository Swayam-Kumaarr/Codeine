
create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  github_enabled boolean not null default true,
  github_inactive_days int not null default 7,
  leetcode_daily boolean not null default true,
  leetcode_contests boolean not null default true,
  gym_reminder boolean not null default true,
  gym_reminder_time time not null default '07:00',
  roadmap_daily boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "Users own their notif_prefs" on public.notification_prefs for all using (auth.uid() = user_id);

create table public.gym_split (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  label text not null default 'Rest',
  exercises jsonb not null default '[]',
  notes text,
  unique(user_id, day_of_week)
);
alter table public.gym_split enable row level security;
create policy "Users own their gym_split" on public.gym_split for all using (auth.uid() = user_id);

create table public.gym_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  split_label text not null,
  notes text,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);
alter table public.gym_logs enable row level security;
create policy "Users own their gym_logs" on public.gym_logs for all using (auth.uid() = user_id);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  sent_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;
create policy "Users see their notif_log" on public.notification_log for select using (auth.uid() = user_id);
create policy "Service inserts notif_log" on public.notification_log for insert with check (true);
