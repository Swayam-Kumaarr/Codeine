-- Run this AFTER schema.sql

-- Award XP to a user
create or replace function public.award_xp(p_user_id uuid, p_xp int, p_reason text)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set
    xp = xp + p_xp,
    level = greatest(1, floor((xp + p_xp) / 500) + 1)
  where id = p_user_id;

  insert into public.xp_log (user_id, xp_gained, reason)
  values (p_user_id, p_xp, p_reason);
end;
$$;

-- Update streak (call after marking a task done)
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
    return; -- already counted today
  end if;

  if v_last = v_today - 1 then
    v_streak := v_streak + 1;
  elsif v_last < v_today - 1 or v_last is null then
    v_streak := 1; -- streak broken or first time
  end if;

  update public.profiles
  set streak = v_streak, last_active = v_today
  where id = p_user_id;
end;
$$;
