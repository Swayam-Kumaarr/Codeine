
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  github_username text,
  leetcode_username text,
  study_time time default '09:00',
  streak int not null default 0,
  xp int not null default 0,
  level int not null default 1,
  last_active date,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users own their profile"
  on public.profiles for all
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  roadmap_id text not null,
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, roadmap_id)
);

alter table public.journeys enable row level security;
create policy "Users own their journeys"
  on public.journeys for all
  using (auth.uid() = user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  roadmap_id text,
  topic_number int,
  title text not null,
  description text,
  scheduled_date date not null default current_date,
  done boolean not null default false,
  done_at timestamptz,
  xp_value int not null default 20,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "Users own their tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

create index tasks_user_date on public.tasks (user_id, scheduled_date);

create table public.streak_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  tasks_done int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.streak_log enable row level security;
create policy "Users own their streak log"
  on public.streak_log for all
  using (auth.uid() = user_id);

create table public.xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  xp_gained int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.xp_log enable row level security;
create policy "Users own their xp log"
  on public.xp_log for all
  using (auth.uid() = user_id);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  event_date date not null,
  event_type text not null default 'custom',
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;
create policy "Users own their calendar"
  on public.calendar_events for all
  using (auth.uid() = user_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.push_subscriptions enable row level security;
create policy "Users own their push sub"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);
