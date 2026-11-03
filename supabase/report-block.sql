-- Third Space: report and block.
-- Anyone signed in can report a post or block a person. A post that gets 3
-- reports hides itself until a moderator checks it. Paste into Supabase →
-- SQL Editor → New query and press Run, after anonymous-posts.sql.
-- It is safe to run more than once.

-- 1. Moderation details on posts.
--    hidden_at: when the post was hidden for having too many reports.
--    checked_ok: a moderator looked and it's fine, so it won't hide again.
alter table public.posts add column if not exists hidden_at timestamptz;
alter table public.posts add column if not exists checked_ok boolean not null default false;

-- People can't hide, unhide or pre-approve posts themselves. Only the
-- automatic 3-report rule and moderators (in the Supabase dashboard) can.
create or replace function public.guard_moderation() returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.hidden_at := null;
      new.checked_ok := false;
    else
      new.hidden_at := old.hidden_at;
      new.checked_ok := old.checked_ok;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_moderation on public.posts;
create trigger guard_moderation before insert or update on public.posts
  for each row execute function public.guard_moderation();

-- 2. Reports. One report per person per post. Its post_id matches whatever
--    type posts.id already uses.
do $$
declare
  post_id_type text;
begin
  select format_type(atttypid, atttypmod) into post_id_type
    from pg_attribute where attrelid = 'public.posts'::regclass and attname = 'id';
  execute format($sql$
    create table if not exists public.reports (
      post_id %s not null references public.posts(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      reason text not null check (reason in ('bullying', 'private', 'threat', 'sexual', 'spam', 'other')),
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    )$sql$, post_id_type);
end $$;

alter table public.reports enable row level security;
drop policy if exists "Users see their own reports" on public.reports;
create policy "Users see their own reports" on public.reports for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users report as themselves" on public.reports;
create policy "Users report as themselves" on public.reports for insert to authenticated with check (auth.uid() = user_id);

-- 3. The 3-report rule.
create or replace function public.hide_after_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.posts p set hidden_at = now()
    where p.id = new.post_id and p.hidden_at is null and not p.checked_ok
      and (select count(*) from public.reports r where r.post_id = new.post_id) >= 3;
  return new;
end $$;
drop trigger if exists hide_after_reports on public.reports;
create trigger hide_after_reports after insert on public.reports
  for each row execute function public.hide_after_reports();

-- 4. Blocks. Only the person who blocked can see their own list.
--    Blocking only works on posts that show a name, so it never reveals
--    who is behind an anonymous post.
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "Users see their own blocks" on public.blocks;
create policy "Users see their own blocks" on public.blocks for select to authenticated using (auth.uid() = blocker_id);
drop policy if exists "Users block as themselves" on public.blocks;
create policy "Users block as themselves" on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists "Users unblock" on public.blocks;
create policy "Users unblock" on public.blocks for delete to authenticated using (auth.uid() = blocker_id);

-- 5. The feed the app reads, as in anonymous-posts.sql, now leaving out
--    hidden posts (their poster still sees them, marked as being checked).
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
    from pg_attribute
    where attrelid = 'public.posts'::regclass and attnum > 0 and not attisdropped and attname <> 'user_id';
  revoke select on public.posts from anon, authenticated;
  execute format('grant select (%s) on public.posts to anon, authenticated', cols);

  drop view if exists public.feed;
  execute format($sql$
    create view public.feed as
      select %s,
        case when p.name_hidden_until is null or p.name_hidden_until <= now() or p.user_id = auth.uid()
          then p.user_id end as author_id,
        coalesce(p.name_hidden_until > now(), false) as anonymous
      from public.posts p
      where p.hidden_at is null or p.user_id = auth.uid()$sql$,
    (select string_agg('p.' || c, ', ') from unnest(string_to_array(cols, ', ')) c));
end $$;
grant select on public.feed to anon, authenticated;

-- 6. The moderators' list: Supabase → Table Editor → report_queue.
--    To put a post back: open it in the posts table, clear hidden_at and tick
--    checked_ok. To take it down for good: delete the post.
--    poster is the account behind the post (even anonymous ones), for bans.
create or replace view public.report_queue as
  select p.id as post_id, p.caption, p.media_url, p.hidden_at, p.checked_ok,
    count(*) as reports, string_agg(distinct r.reason, ', ') as reasons,
    max(r.created_at) as last_report, p.user_id as poster
  from public.reports r join public.posts p on p.id = r.post_id
  where not p.checked_ok
  group by p.id, p.caption, p.media_url, p.hidden_at, p.checked_ok, p.user_id
  order by max(r.created_at) desc;
revoke all on public.report_queue from anon, authenticated;
