create table if not exists push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz default now(),
  unique(user_id, token)
);

alter table push_tokens enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'push_tokens' and policyname = 'tokens_user_only'
  ) then
    create policy tokens_user_only on push_tokens
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
