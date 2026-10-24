-- Third Space: anonymous posts.
-- Lets people hide their name on a post for a few hours or forever, so nobody
-- can tell where they are in real time. Paste into Supabase → SQL Editor → New
-- query and press Run, after the app update that reads from "feed" is live.
-- It is safe to run more than once.

-- 1. When the poster's name may be shown. Empty means straight away,
--    'infinity' means never.
alter table public.posts add column if not exists name_hidden_until timestamptz;

-- 2. Nobody can read who posted straight from the posts table any more.
--    Every other column stays readable.
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
    from pg_attribute
    where attrelid = 'public.posts'::regclass and attnum > 0 and not attisdropped and attname <> 'user_id';
  revoke select on public.posts from anon, authenticated;
  execute format('grant select (%s) on public.posts to anon, authenticated', cols);

  -- 3. The feed the app reads: the poster's id only once their name may be
  --    shown, or to the poster themselves.
  drop view if exists public.feed;
  execute format($sql$
    create view public.feed as
      select %s,
        case when p.name_hidden_until is null or p.name_hidden_until <= now() or p.user_id = auth.uid()
          then p.user_id end as author_id,
        coalesce(p.name_hidden_until > now(), false) as anonymous
      from public.posts p$sql$, (select string_agg('p.' || c, ', ') from unnest(string_to_array(cols, ', ')) c));
end $$;
grant select on public.feed to anon, authenticated;

-- 4. Photos for anonymous posts go in a shared "anon" folder, so the file
--    address doesn't give away who uploaded it.
drop policy if exists "Users upload anonymous media" on storage.objects;
create policy "Users upload anonymous media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = 'anon');
