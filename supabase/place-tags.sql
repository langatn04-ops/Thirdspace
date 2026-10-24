-- Third Space: interests for searching places.
-- Gives each place a few interest words (like "indian food", "walk",
-- "comedy" or "tourist") and adds Indian restaurants, comedy clubs and
-- tourist spots. Paste into Supabase → SQL Editor → New query and press Run.
-- It never removes anything and is safe to run more than once.

-- 1. Interest words for each place.
alter table public.venues add column if not exists tags text[] not null default '{}';

-- 2. New places. Ones already there (same name) are skipped. The venues table
--    only allows its own category words, so each tries ours, then close
--    matches, then the category most places already use.
do $$
declare
  v record;
  cats text[];
  cat text;
  added boolean;
begin
  for v in select * from (values
    ('Jaipur', 'restaurant', '41 South Great George’s Street', 53.3418, -6.2646),
    ('Pickle', 'restaurant', '43 Camden Street Lower', 53.3364, -6.2652),
    ('Konkan', 'restaurant', '46 Clanbrassil Street Upper', 53.3335, -6.2725),
    ('The Laughter Lounge', 'comedy', '4 Eden Quay', 53.3480, -6.2575),
    ('The International Bar', 'bar', '23 Wicklow Street', 53.3428, -6.2610),
    ('Guinness Storehouse', 'tourist', 'St James’s Gate', 53.3419, -6.2867),
    ('Trinity College and the Book of Kells', 'tourist', 'College Green', 53.3438, -6.2546),
    ('Ha’penny Bridge', 'tourist', 'Liffey', 53.3463, -6.2630),
    ('Dublin Castle', 'tourist', 'Dame Street', 53.3429, -6.2674),
    ('Christ Church Cathedral', 'tourist', 'Christchurch Place', 53.3435, -6.2710),
    ('Kilmainham Gaol', 'tourist', 'Inchicore Road', 53.3419, -6.3097),
    ('Jameson Distillery Bow St', 'tourist', 'Bow Street, Smithfield', 53.3486, -6.2770),
    ('National Gallery of Ireland', 'tourist', 'Merrion Square West', 53.3409, -6.2525),
    ('EPIC The Irish Emigration Museum', 'tourist', 'CHQ, Custom House Quay', 53.3486, -6.2480)
  ) as s(name, category, address, lat, lng)
  loop
    continue when exists (
      select 1 from public.venues
      where lower(replace(name, '’', '''')) = lower(replace(v.name, '’', '''')));
    cats := case v.category
      when 'bar' then array['bar', 'pub']
      when 'restaurant' then array['restaurant', 'food', 'cafe', 'café']
      when 'comedy' then array['comedy', 'entertainment', 'event', 'venue', 'music', 'club', 'bar', 'pub']
      when 'tourist' then array['tourist', 'attraction', 'landmark', 'museum', 'culture', 'sightseeing', 'street', 'outdoor', 'park']
    end || array(select category from public.venues where category is not null
                 group by category order by count(*) desc limit 1);
    added := false;
    foreach cat in array cats loop
      begin
        insert into public.venues (name, category, latitude, longitude, address)
        values (v.name, cat, v.lat, v.lng, v.address);
        added := true;
        exit;
      exception when check_violation then
        null;
      end;
    end loop;
    if not added then
      raise notice 'Skipped %: no category it accepts', v.name;
    end if;
  end loop;
end $$;

-- 3. The interest words, matched to places by name.
update public.venues v set tags = t.tags
from (values
  ('The Brazen Head', array['pub', 'trad music', 'live music', 'historic', 'tourist', 'food']),
  ('The Long Hall', array['pub', 'historic']),
  ('Grogan’s', array['pub', 'chill', 'toasties']),
  ('The Stag’s Head', array['pub', 'historic', 'comedy']),
  ('Kehoe’s', array['pub', 'cosy', 'chill']),
  ('Mulligan’s', array['pub', 'historic', 'guinness']),
  ('The Temple Bar Pub', array['pub', 'trad music', 'live music', 'tourist']),
  ('Toners', array['pub', 'beer garden', 'historic']),
  ('O’Donoghue’s', array['pub', 'trad music', 'live music', 'historic']),
  ('The Cobblestone', array['pub', 'trad music', 'live music']),
  ('The Palace Bar', array['pub', 'historic', 'whiskey']),
  ('Davy Byrnes', array['pub', 'food', 'historic', 'tourist']),
  ('The Hairy Lemon', array['pub', 'food']),
  ('P. Mac’s', array['pub', 'craft beer', 'board games', 'chill']),
  ('The Gravediggers', array['pub', 'historic', 'guinness']),
  ('Whelan’s', array['live music', 'gigs', 'nightlife', 'pub']),
  ('Opium', array['club', 'nightclub', 'dancing', 'nightlife', 'cocktails']),
  ('Vicar Street', array['live music', 'gigs', 'comedy']),
  ('Olympia Theatre', array['theatre', 'gigs', 'comedy', 'live music']),
  ('Button Factory', array['club', 'nightclub', 'dancing', 'live music', 'nightlife']),
  ('The Workman’s Club', array['club', 'live music', 'nightlife', 'bar']),
  ('The Academy', array['club', 'nightclub', 'gigs', 'nightlife']),
  ('The Sugar Club', array['live music', 'jazz', 'cocktails', 'comedy']),
  ('Fibber Magees', array['rock', 'live music', 'nightlife', 'bar']),
  ('3Arena', array['concerts', 'gigs', 'live music']),
  ('Bord Gáis Energy Theatre', array['theatre', 'musicals', 'shows']),
  ('Bewley’s Grafton Street', array['cafe', 'coffee', 'breakfast', 'historic', 'tourist']),
  ('The Woollen Mills', array['restaurant', 'irish food', 'brunch', 'food']),
  ('Brother Hubbard', array['cafe', 'brunch', 'middle eastern food', 'vegetarian']),
  ('Fallon & Byrne', array['food hall', 'wine bar', 'restaurant', 'food']),
  ('The Fumbally', array['cafe', 'brunch', 'vegetarian', 'chill']),
  ('Two Boys Brew', array['cafe', 'coffee', 'brunch']),
  ('Herbstreet', array['restaurant', 'brunch', 'waterside', 'food']),
  ('St Stephen’s Green', array['park', 'walk', 'chill', 'picnic', 'tourist']),
  ('Phoenix Park', array['park', 'walk', 'deer', 'cycling', 'chill', 'tourist']),
  ('Merrion Square', array['park', 'walk', 'chill', 'picnic']),
  ('Iveagh Gardens', array['park', 'walk', 'chill', 'hidden gem']),
  ('Herbert Park', array['park', 'walk', 'chill']),
  ('Grand Canal Dock', array['waterside', 'walk', 'outdoor']),
  ('Sandymount Strand', array['beach', 'walk', 'sea', 'chill']),
  ('Dollymount Strand', array['beach', 'walk', 'sea', 'kitesurfing']),
  ('Dún Laoghaire Pier', array['walk', 'sea', 'chill']),
  ('The Forty Foot', array['swimming', 'sea', 'beach']),
  ('Howth Harbour', array['walk', 'cliff walk', 'seafood', 'sea', 'tourist']),
  ('Grafton Street', array['shopping', 'buskers', 'tourist']),
  ('Temple Bar Square', array['tourist', 'nightlife', 'buskers']),
  ('Camden Street', array['nightlife', 'food', 'bars']),
  ('Capel Street', array['food', 'restaurants', 'shopping']),
  ('George’s Street Arcade', array['shopping', 'market', 'vintage']),
  ('Smithfield Square', array['square', 'events']),
  ('Jaipur', array['indian food', 'curry', 'restaurant']),
  ('Pickle', array['indian food', 'curry', 'restaurant']),
  ('Konkan', array['indian food', 'curry', 'restaurant']),
  ('The Laughter Lounge', array['comedy', 'stand-up', 'nightlife']),
  ('The International Bar', array['pub', 'comedy', 'historic']),
  ('Guinness Storehouse', array['tourist', 'guinness', 'museum', 'views']),
  ('Trinity College and the Book of Kells', array['tourist', 'historic', 'museum', 'walk']),
  ('Ha’penny Bridge', array['tourist', 'landmark', 'walk', 'historic']),
  ('Dublin Castle', array['tourist', 'historic', 'landmark', 'museum']),
  ('Christ Church Cathedral', array['tourist', 'historic', 'landmark']),
  ('Kilmainham Gaol', array['tourist', 'historic', 'museum']),
  ('Jameson Distillery Bow St', array['tourist', 'whiskey', 'museum']),
  ('National Gallery of Ireland', array['tourist', 'museum', 'art', 'chill']),
  ('EPIC The Irish Emigration Museum', array['tourist', 'museum', 'historic'])
) as t(name, tags)
where lower(replace(v.name, '’', '''')) = lower(replace(t.name, '’', ''''));

select count(*) filter (where tags <> '{}') as places_with_interests, count(*) as places_on_the_map from public.venues;
