
create table if not exists cgpa_semesters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  sem_number   int  not null,
  subjects     jsonb not null default '[]',
  calculated_gpa numeric(4,2),
  created_at   timestamptz default now(),
  unique(user_id, sem_number)
);

alter table cgpa_semesters enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'cgpa_semesters' and policyname = 'cgpa_user_only'
  ) then
    create policy cgpa_user_only on cgpa_semesters
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  problem     text not null default '',
  tech_stack  text[] not null default '{}',
  status      text not null default 'brainstorm'
                check (status in ('brainstorm','in-progress','submitted','won','abandoned')),
  notes       text not null default '',
  links       text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at  timestamptz default now()
);

alter table ideas enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ideas' and policyname = 'ideas_user_only'
  ) then
    create policy ideas_user_only on ideas
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists achievements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null default 'hackathon'
               check (type in ('hackathon','certification','oss','project','award')),
  title      text not null,
  org        text not null default '',
  date       text not null default '',
  result     text not null default '',
  link       text not null default '',
  notes      text not null default '',
  created_at timestamptz default now()
);

alter table achievements enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'achievements' and policyname = 'achievements_user_only'
  ) then
    create policy achievements_user_only on achievements
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists timetable_blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 5),
  start_time   time not null,
  end_time     time not null,
  label        text not null,
  subject_code text not null default '',
  room         text not null default '',
  batch        text not null default '',
  created_at   timestamptz default now()
);

alter table timetable_blocks enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'timetable_blocks' and policyname = 'timetable_user_only'
  ) then
    create policy timetable_user_only on timetable_blocks
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  date       date not null,
  built      text not null default '',
  hard       text not null default '',
  tomorrow   text not null default '',
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table journal_entries enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'journal_entries' and policyname = 'journal_user_only'
  ) then
    create policy journal_user_only on journal_entries
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists consent_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete set null,
  email        text,
  consent_type text not null,
  accepted     boolean not null,
  ip_address   text,
  user_agent   text,
  tc_version   text,
  pp_version   text,
  created_at   timestamptz default now()
);

create table if not exists custom_roadmaps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text not null default '',
  created_at  timestamptz default now()
);

create table if not exists custom_roadmap_topics (
  id          uuid primary key default gen_random_uuid(),
  roadmap_id  uuid not null references custom_roadmaps(id) on delete cascade,
  name        text not null,
  duration_days int not null default 1,
  position    int  not null default 0,
  notes       text not null default ''
);

create table if not exists custom_journeys (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  custom_roadmap_id uuid not null references custom_roadmaps(id) on delete cascade,
  started_at        date not null default current_date,
  paused_at         date,
  days_paused       int  not null default 0,
  unique(user_id, custom_roadmap_id)
);

alter table journeys add column if not exists paused_at date;
alter table journeys add column if not exists days_paused int not null default 0;
alter table custom_journeys add column if not exists paused_at date;
alter table custom_journeys add column if not exists days_paused int not null default 0;

create index if not exists idx_streak_log_user_date on streak_log(user_id, log_date desc);

create or replace function award_xp(p_user_id uuid, p_xp int, p_reason text)
returns void language plpgsql security definer as $$
declare
  new_xp int;
  new_level int;
begin
  update profiles
  set xp = greatest(0, xp + p_xp)
  where id = p_user_id
  returning xp into new_xp;
  new_level := floor(new_xp / 500) + 1;
  update profiles set level = new_level where id = p_user_id;
end;
$$;

create or replace function update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  today date := current_date;
  yesterday date := current_date - 1;
  today_done int;
  today_total int;
  streak_cnt int;
begin
  select count(*) into today_total from tasks where user_id = p_user_id and scheduled_date = today;
  select count(*) into today_done  from tasks where user_id = p_user_id and scheduled_date = today and done = true;

  if today_total > 0 and today_done = today_total then
    update profiles set last_active = today where id = p_user_id;

    select streak into streak_cnt from profiles where id = p_user_id;
    if streak_cnt = 0 then
      update profiles set streak = 1 where id = p_user_id;
    else
      if exists (select 1 from streak_log where user_id = p_user_id and log_date = yesterday) then
        update profiles set streak = streak + 1 where id = p_user_id;
      else
        update profiles set streak = 1 where id = p_user_id;
      end if;
    end if;
  end if;
end;
$$;

create or replace function update_login_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  today date := current_date;
  yesterday date := current_date - 1;
  last_login date;
begin
  select last_login_date into last_login from profiles where id = p_user_id;

  if last_login = today then
    return;
  end if;

  if last_login = yesterday then
    update profiles set login_streak = login_streak + 1, last_login_date = today where id = p_user_id;
  else
    update profiles set login_streak = 1, last_login_date = today where id = p_user_id;
  end if;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'unique_timetable_slot'
  ) then
    alter table timetable_blocks add constraint unique_timetable_slot unique (user_id, day_of_week, start_time);
  end if;
end $$;
