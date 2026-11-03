-- Third Space: word filter.
-- Captions and comments can't contain slurs, threats or phone numbers.
-- The database checks every caption and comment, so nobody can get round it.
-- Paste into Supabase → SQL Editor → New query and press Run.
-- It is safe to run more than once.
--
-- To add or remove words: Table Editor → blocked_words. Use lowercase letters
-- and spaces only (for example "kill yourself"). Simple disguises are caught
-- too: "k1ll y0urself", "KILL YOURSELF", and a plural "s" on the end.

-- 1. The list of words and phrases. Hidden from the app, so it can't be read
--    and worked around.
create table if not exists public.blocked_words (
  word text primary key check (word ~ '^[a-z ]+$'),
  kind text not null default 'slur' check (kind in ('slur', 'threat')),
  created_at timestamptz not null default now()
);
alter table public.blocked_words enable row level security;
revoke all on public.blocked_words from anon, authenticated;

insert into public.blocked_words (word, kind) values
  -- Slurs (race, religion, Travellers, sexuality, gender, disability)
  ('nigger', 'slur'), ('nigga', 'slur'), ('negro', 'slur'), ('coon', 'slur'), ('chink', 'slur'),
  ('gook', 'slur'), ('paki', 'slur'), ('spic', 'slur'), ('wetback', 'slur'), ('kike', 'slur'),
  ('raghead', 'slur'), ('towelhead', 'slur'), ('sand nigger', 'slur'), ('knacker', 'slur'),
  ('pikey', 'slur'), ('gyppo', 'slur'), ('faggot', 'slur'), ('dyke', 'slur'),
  ('tranny', 'slur'), ('shemale', 'slur'), ('retard', 'slur'), ('spastic', 'slur'),
  -- Threats
  ('kill yourself', 'threat'), ('kys', 'threat'), ('go die', 'threat'), ('hope you die', 'threat'),
  ('you should die', 'threat'), ('i will kill you', 'threat'), ('ill kill you', 'threat'),
  ('im going to kill you', 'threat'), ('gonna kill you', 'threat'), ('going to stab you', 'threat'),
  ('ill stab you', 'threat'), ('i will stab you', 'threat'), ('i know where you live', 'threat'),
  ('ill find you', 'threat')
on conflict (word) do nothing;

-- 2. What's wrong with a piece of text, worded for the person writing it,
--    or nothing if it's fine. The app asks this before uploading a photo.
create or replace function public.text_problem(t text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  norm text;
  bad record;
begin
  if t is null or btrim(t) = '' then
    return null;
  end if;

  -- Phone numbers: 9 or more digits in a row, allowing spaces, dashes,
  -- dots and brackets between them (087 123 4567, +353 87-123-4567).
  if exists (
    select 1 from regexp_matches(t, '\+?[0-9][0-9 ().-]{7,}[0-9]', 'g') m
    where length(regexp_replace(m[1], '[^0-9]', '', 'g')) >= 9
  ) then
    return 'Please don’t share phone numbers. Swap details in private instead.';
  end if;

  -- Lowercase, undo number-for-letter swaps, drop apostrophes, and turn
  -- everything else that isn't a letter into a single space.
  norm := lower(t);
  norm := translate(norm, '013457@$!', 'oieastasi');
  norm := regexp_replace(norm, '[''’]', '', 'g');
  norm := ' ' || btrim(regexp_replace(norm, '[^a-z]+', ' ', 'g')) || ' ';

  for bad in select w.word, w.kind from public.blocked_words w loop
    if position(' ' || bad.word || ' ' in norm) > 0
       or position(' ' || bad.word || 's ' in norm) > 0
       or position(' ' || bad.word || 'es ' in norm) > 0 then
      return case bad.kind
        when 'threat' then 'Threats aren’t allowed on Third Space. Please change what you wrote.'
        else 'That includes a word that isn’t allowed on Third Space. Please change what you wrote.'
      end;
    end if;
  end loop;
  return null;
end $$;
revoke execute on function public.text_problem(text) from public, anon;
grant execute on function public.text_problem(text) to authenticated;

-- 3. Check captions and comments whenever they're written or changed.
create or replace function public.filter_caption() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  problem text := public.text_problem(new.caption);
begin
  if problem is not null and auth.uid() is not null then
    raise exception '%', problem using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists filter_caption on public.posts;
create trigger filter_caption before insert or update of caption on public.posts
  for each row execute function public.filter_caption();

create or replace function public.filter_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  problem text := public.text_problem(new.body);
begin
  if problem is not null and auth.uid() is not null then
    raise exception '%', problem using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists filter_comment on public.comments;
create trigger filter_comment before insert or update of body on public.comments
  for each row execute function public.filter_comment();
