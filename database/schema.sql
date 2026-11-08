-- Run in the Supabase SQL editor. Safe to rerun.
create table if not exists public.livestream (
 id integer primary key default 1 check(id=1),
 video_id text check(video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$'),
 status text not null default 'upcoming' check(status in ('upcoming','live','ended')),
 announcement text check(announcement is null or length(announcement)<=500),
 updated_at timestamptz not null default now(),
 constraint live_requires_video check(status <> 'live' or video_id is not null)
);
insert into public.livestream(id,status) values(1,'upcoming') on conflict(id) do nothing;
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create or replace function public.touch_livestream_updated_at()
returns trigger language plpgsql set search_path = '' as $$begin new.updated_at=now();return new;end$$;
drop trigger if exists trg_livestream_updated_at on public.livestream;
create trigger trg_livestream_updated_at before update on public.livestream for each row execute function public.touch_livestream_updated_at();
alter table public.livestream enable row level security;
alter table public.admin_users enable row level security;
drop policy if exists "Public can read livestream" on public.livestream;
create policy "Public can read livestream" on public.livestream for select to anon,authenticated using (true);
drop policy if exists "Operators can update livestream" on public.livestream;
create policy "Operators can update livestream" on public.livestream for update to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid()))) with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
drop policy if exists "Operators can read own membership" on public.admin_users;
create policy "Operators can read own membership" on public.admin_users for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;
grant select on public.livestream to anon,authenticated;
grant update on public.livestream to authenticated;
-- IMPORTANT: Create an email/password user in Supabase Authentication > Users.
-- Then replace the UUID below and execute this statement separately:
-- insert into public.admin_users(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
-- Do not allow public signup to create operator privileges.

-- Operator-only configuration. Never exposed through Supabase client APIs.
create table if not exists public.broadcast_settings (
 id integer primary key default 1 check (id=1),
 channel_handle text,
 channel_id text,
 channel_title text,
 api_key_encrypted text,
 auto_publish boolean not null default false
);
insert into public.broadcast_settings(id) values(1) on conflict(id) do nothing;
alter table public.broadcast_settings enable row level security;
revoke all on public.broadcast_settings from anon, authenticated;
-- No client policies: only the Vercel server function using service-role access can read/write.
