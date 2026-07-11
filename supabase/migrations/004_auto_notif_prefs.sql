-- Auto-create notification_prefs row when a new user signs up.
-- Without this, the notify crons can't find user preferences until
-- the user manually visits the Notifications page.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.notification_prefs (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Backfill: create missing notification_prefs rows for existing users
insert into public.notification_prefs (user_id)
select id from public.profiles
where id not in (select user_id from public.notification_prefs)
on conflict (user_id) do nothing;
