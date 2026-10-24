-- Third Space: database additions for the new design.
-- Adds comments, likes, saves, journal reviews, video posts and photo/video storage.
-- Paste the whole file into Supabase → SQL Editor → New query, then press Run.
-- It is safe to run more than once.

-- 1. New details on posts
alter table public.posts add column if not exists created_at timestamptz not null default now();
alter table public.posts add column if not exists media_type text not null default 'image';
alter table public.posts add column if not exists allow_comments boolean not null default true;

-- 2. New tables. Their id columns match whatever type posts.id and venues.id already use.
do $$
declare
  post_id_type text;
  venue_id_type text;
begin
  select format_type(atttypid, atttypmod) into post_id_type
    from pg_attribute where attrelid = 'public.posts'::regclass and attname = 'id';
  select format_type(atttypid, atttypmod) into venue_id_type
    from pg_attribute where attrelid = 'public.venues'::regclass and attname = 'id';

  execute format($sql$
    create table if not exists public.comments (
      id uuid primary key default gen_random_uuid(),
      post_id %s not null references public.posts(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      body text not null check (char_length(body) between 1 and 300),
      verdict text check (verdict in ('good', 'bad')),
      created_at timestamptz not null default now()
    )$sql$, post_id_type);

  execute format($sql$
    create table if not exists public.likes (
      post_id %s not null references public.posts(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    )$sql$, post_id_type);

  execute format($sql$
    create table if not exists public.saves (
      post_id %s not null references public.posts(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    )$sql$, post_id_type);

  execute format($sql$
    create table if not exists public.journal_articles (
      id uuid primary key default gen_random_uuid(),
      venue_id %s references public.venues(id) on delete set null,
      title text not null,
      dek text,
      author_name text,
      rating int check (rating between 1 and 5),
      read_minutes int not null default 3,
      body text,
      published_at timestamptz not null default now()
    )$sql$, venue_id_type);
end $$;

create index if not exists comments_post_id_idx on public.comments (post_id);

-- 3. Public profile names. Shows only id, username and avatar, never email addresses.
create or replace view public.profiles as
  select id, coalesce(nullif(username, ''), split_part(email, '@', 1)) as username, avatar_url
  from public.users;
grant select on public.profiles to anon, authenticated;

-- 4. Who can do what (row level security)
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.journal_articles enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts" on public.posts for select using (true);
drop policy if exists "Users add their own posts" on public.posts;
create policy "Users add their own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update their own posts" on public.posts;
create policy "Users update their own posts" on public.posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments" on public.comments for select using (true);
drop policy if exists "Users add their own comments" on public.comments;
create policy "Users add their own comments" on public.comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users delete their own comments" on public.comments;
create policy "Users delete their own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can read likes" on public.likes;
create policy "Anyone can read likes" on public.likes for select using (true);
drop policy if exists "Users like as themselves" on public.likes;
create policy "Users like as themselves" on public.likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove their own likes" on public.likes;
create policy "Users remove their own likes" on public.likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users see their own saves" on public.saves;
create policy "Users see their own saves" on public.saves for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users save as themselves" on public.saves;
create policy "Users save as themselves" on public.saves for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove their own saves" on public.saves;
create policy "Users remove their own saves" on public.saves for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can read the journal" on public.journal_articles;
create policy "Anyone can read the journal" on public.journal_articles for select using (true);

-- 5. Storage for photos and videos (public to view, 50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "Users upload to their own folder" on storage.objects;
create policy "Users upload to their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete their own uploads" on storage.objects;
create policy "Users delete their own uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 6. The first four journal reviews
insert into public.journal_articles (venue_id, title, dek, author_name, rating, read_minutes, body, published_at)
select (select id from public.venues where name ilike '%' || v || '%' limit 1), t, d, a, r, m, b, now() - (o || ' hours')::interval
from (values
  ('Brazen', 'The Brazen Head, after dark', 'Dublin’s oldest pub earns its reputation once the music starts.', 'Aoife Daly', 5, 4,
   E'Come after nine and the front room turns into a live trad session. The musicians sit in the corner by the fire and nobody asks you to be quiet, only to listen.\n\nThe Guinness is poured properly and the staff move fast even when it’s packed. Go early for a seat, or stand by the courtyard door where you can still hear every tune.', 0),
  ('Grogan', 'Grogan’s and the case for the toastie', 'The simplest lunch in the city, still done properly.', 'Eoin Byrne', 4, 3,
   E'The ham and cheese toastie here has barely changed in years, and that is the point. It arrives hot, wrapped in foil, with a little relish on the side.\n\nTake the window seat and let the afternoon go. It gets loud after six, so aim for the quieter hours if you want to hear your friends.', 1),
  ('Temple Bar', 'Temple Bar Square: is the crowd worth it?', 'Great street performers, steep prices and very little elbow room.', 'Niamh Walsh', 2, 3,
   E'The performers are the real draw. A fire juggler and a drum circle can make the square feel electric on a warm night.\n\nBut drinks nearby cost far more than they should, and before eight the square is shoulder to shoulder. Watch the show, then walk five minutes to a better pub.', 2),
  ('Phoenix', 'Phoenix Park at golden hour', 'Where to find quiet when the city gets loud.', 'Sorcha Lynch', 4, 3,
   E'Enter from the Parkgate Street side and walk toward the deer. In the hour before sunset the light turns the whole field gold and the crowds thin out.\n\nThere is nowhere good for coffee nearby, so bring a flask. The walk back along the avenue is worth the extra ten minutes.', 3)
) as s(v, t, d, a, r, m, b, o)
where not exists (select 1 from public.journal_articles j where j.title = s.t);
