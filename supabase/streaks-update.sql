
alter table public.profiles
  add column if not exists login_streak int not null default 0,
  add column if not exists last_login date;

create or replace function public.update_login_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_today date := current_date;
  v_last  date;
  v_streak int;
begin
  select last_login, login_streak into v_last, v_streak
  from public.profiles where id = p_user_id;

  if v_last = v_today then return; end if;

  if v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
  set login_streak = v_streak, last_login = v_today
  where id = p_user_id;
end;
$$;

create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_today  date := current_date;
  v_last   date;
  v_streak int;
  v_total  int;
  v_done   int;
begin
  select
    count(*),
    count(*) filter (where done = true)
  into v_total, v_done
  from public.tasks
  where user_id = p_user_id and scheduled_date = v_today;

  if v_total = 0 or v_done < v_total then return; end if;

  select last_active, streak into v_last, v_streak
  from public.profiles where id = p_user_id;

  if v_last = v_today then return; end if;

  if v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles
  set streak = v_streak, last_active = v_today
  where id = p_user_id;
end;
$$;
