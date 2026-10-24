-- Third Space: favourite places and updates.
-- Lets people favourite a place and see new posts from it in Updates.
-- Paste into Supabase → SQL Editor → New query and press Run.
-- It only adds new tables; it is safe to run more than once.

-- 1. Which places each person has favourited. Its venue_id matches whatever
--    type venues.id already uses.
do $$
declare
  venue_id_type text;
begin
  select format_type(atttypid, atttypmod) into venue_id_type
    from pg_attribute where attrelid = 'public.venues'::regclass and attname = 'id';
  execute format($sql$
    create table if not exists public.favourite_places (
      user_id uuid not null references auth.users(id) on delete cascade,
      venue_id %s not null references public.venues(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, venue_id)
    )$sql$, venue_id_type);
end $$;

-- 2. When each person last opened Updates, so new posts can be counted.
create table if not exists public.update_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);

-- 3. People only ever see and change their own.
alter table public.favourite_places enable row level security;
alter table public.update_reads enable row level security;

drop policy if exists "Users see their own favourites" on public.favourite_places;
create policy "Users see their own favourites" on public.favourite_places for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users add their own favourites" on public.favourite_places;
create policy "Users add their own favourites" on public.favourite_places for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove their own favourites" on public.favourite_places;
create policy "Users remove their own favourites" on public.favourite_places for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users see when they last read updates" on public.update_reads;
create policy "Users see when they last read updates" on public.update_reads for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users record reading updates" on public.update_reads;
create policy "Users record reading updates" on public.update_reads for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update when they read updates" on public.update_reads;
create policy "Users update when they read updates" on public.update_reads for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
