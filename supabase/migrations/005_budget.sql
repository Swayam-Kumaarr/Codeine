-- Budget tracker tables

create table public.budget_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  monthly_income numeric(12,2) not null default 0,
  tax_pct numeric(5,2) not null default 0,
  savings_pct numeric(5,2) not null default 20,
  updated_at timestamptz not null default now()
);
alter table public.budget_settings enable row level security;
create policy "Users own their budget_settings" on public.budget_settings
  for all using (auth.uid() = user_id);

create table public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null,
  description text not null,
  category text not null default 'Other',
  date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);
alter table public.budget_transactions enable row level security;
create policy "Users own their budget_transactions" on public.budget_transactions
  for all using (auth.uid() = user_id);
