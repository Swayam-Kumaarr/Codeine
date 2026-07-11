
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

create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_today date := current_date;
  v_last date;
  v_streak int;
begin
  select last_active, streak into v_last, v_streak
  from public.profiles where id = p_user_id;

  if v_last = v_today then
    return;
  end if;

  if v_last = v_today - 1 then
    v_streak := v_streak + 1;
  elsif v_last < v_today - 1 or v_last is null then
    v_streak := 1;
  end if;

  update public.profiles
  set streak = v_streak, last_active = v_today
  where id = p_user_id;
end;
$$;
