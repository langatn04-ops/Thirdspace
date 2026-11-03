-- Third Space: venue accounts and fair posting.
-- * Venue accounts (bar staff posting for their venue) get a "Venue" label,
--   can't post anonymously, and can only post at their own venue, so they
--   can't fake vibes or trash rivals.
-- * Everyone can post at most twice per place per hour.
-- Paste into Supabase → SQL Editor → New query and press Run.
-- It is safe to run more than once.
--
-- To make someone a venue account: Table Editor → venue_accounts → Insert row,
-- with their user id (from Authentication → Users) and the venue's id.

-- 1. Which accounts belong to a venue. Everyone can see this, so the app can
--    show the label. Only Nicole (in the dashboard) can change it.
do $$
declare
  venue_id_type text;
begin
  select format_type(atttypid, atttypmod) into venue_id_type
    from pg_attribute where attrelid = 'public.venues'::regclass and attname = 'id';
  execute format($sql$
    create table if not exists public.venue_accounts (
      user_id uuid primary key references auth.users(id) on delete cascade,
      venue_id %s not null references public.venues(id) on delete cascade,
      created_at timestamptz not null default now()
    )$sql$, venue_id_type);
end $$;
alter table public.venue_accounts enable row level security;
drop policy if exists "Anyone can see venue accounts" on public.venue_accounts;
create policy "Anyone can see venue accounts" on public.venue_accounts for select using (true);

-- 2. The posting rules, checked by the database so nobody can get round them.
--    The messages are shown to the person posting.
create or replace function public.posting_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  own_venue text;
  recent int;
  oldest timestamptz;
begin
  -- Only posts made through the app. Nicole can still add anything in the dashboard.
  if auth.uid() is null then
    return new;
  end if;

  -- The post time is always now, so it can't be faked to dodge the hourly limit.
  new.created_at := now();

  select va.venue_id::text into own_venue from public.venue_accounts va where va.user_id = new.user_id;
  if own_venue is not null then
    if new.name_hidden_until is not null then
      raise exception 'Venue accounts can’t post anonymously.' using errcode = 'P0001';
    end if;
    if new.venue_id::text <> own_venue then
      raise exception 'Venue accounts can only post at their own venue.' using errcode = 'P0001';
    end if;
  end if;

  -- At most 2 posts per place in any hour. The wait is until the older of
  -- the two is an hour old.
  select count(*), min(p.created_at) into recent, oldest from public.posts p
    where p.user_id = new.user_id and p.venue_id = new.venue_id and p.created_at > now() - interval '1 hour';
  if recent >= 2 then
    raise exception 'You’ve already posted here twice in the last hour. You can post here again in % min.',
      greatest(1, ceil(60 - extract(epoch from now() - oldest) / 60)::int)
      using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists posting_rules on public.posts;
create trigger posting_rules before insert on public.posts
  for each row execute function public.posting_rules();

create index if not exists posts_user_venue_time_idx on public.posts (user_id, venue_id, created_at);
