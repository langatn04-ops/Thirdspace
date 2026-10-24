-- Third Space: real Dublin places to post from.
-- Paste into Supabase → SQL Editor → New query and press Run.
-- It only adds places; it never changes or removes any. Places that are
-- already there (same name) are skipped, so it is safe to run more than once.
-- Map positions are close but approximate; a pin can be nudged later.

do $$
declare
  v record;
  cats text[];
  cat text;
  added boolean;
begin
  for v in select * from (values
    -- Pubs and bars
    ('The Brazen Head', 'bar', '20 Bridge Street Lower', 53.3449, -6.2766),
    ('The Long Hall', 'bar', '51 South Great George’s Street', 53.3427, -6.2647),
    ('Grogan’s', 'bar', '15 William Street South', 53.3417, -6.2626),
    ('The Stag’s Head', 'bar', '1 Dame Court', 53.3433, -6.2637),
    ('Kehoe’s', 'bar', '9 South Anne Street', 53.3414, -6.2589),
    ('Mulligan’s', 'bar', '8 Poolbeg Street', 53.3468, -6.2550),
    ('The Temple Bar Pub', 'bar', '47 Temple Bar', 53.3455, -6.2635),
    ('Toners', 'bar', '139 Baggot Street Lower', 53.3364, -6.2493),
    ('O’Donoghue’s', 'bar', '15 Merrion Row', 53.3384, -6.2537),
    ('The Cobblestone', 'bar', '77 King Street North, Smithfield', 53.3497, -6.2780),
    ('The Palace Bar', 'bar', '21 Fleet Street', 53.3460, -6.2593),
    ('Davy Byrnes', 'bar', '21 Duke Street', 53.3416, -6.2592),
    ('The Hairy Lemon', 'bar', 'Stephen Street Lower', 53.3405, -6.2650),
    ('P. Mac’s', 'bar', '30 Stephen Street Lower', 53.3401, -6.2652),
    ('The Gravediggers', 'bar', 'Prospect Square, Glasnevin', 53.3720, -6.2735),
    -- Music and nights out
    ('Whelan’s', 'music', '25 Wexford Street', 53.3366, -6.2654),
    ('Opium', 'club', '26 Wexford Street', 53.3368, -6.2656),
    ('Vicar Street', 'music', '58 Thomas Street', 53.3424, -6.2793),
    ('Olympia Theatre', 'music', '72 Dame Street', 53.3443, -6.2661),
    ('Button Factory', 'music', 'Curved Street, Temple Bar', 53.3453, -6.2660),
    ('The Workman’s Club', 'music', '10 Wellington Quay', 53.3456, -6.2670),
    ('The Academy', 'music', '57 Middle Abbey Street', 53.3485, -6.2610),
    ('The Sugar Club', 'music', '8 Leeson Street Lower', 53.3354, -6.2556),
    ('Fibber Magees', 'music', '80 Parnell Street', 53.3528, -6.2633),
    ('3Arena', 'music', 'North Wall Quay', 53.3475, -6.2285),
    ('Bord Gáis Energy Theatre', 'music', 'Grand Canal Square', 53.3440, -6.2402),
    -- Cafés and food
    ('Bewley’s Grafton Street', 'cafe', '78 Grafton Street', 53.3410, -6.2600),
    ('The Woollen Mills', 'restaurant', '42 Ormond Quay Lower', 53.3465, -6.2635),
    ('Brother Hubbard', 'cafe', '153 Capel Street', 53.3478, -6.2689),
    ('Fallon & Byrne', 'restaurant', '11 Exchequer Street', 53.3427, -6.2633),
    ('The Fumbally', 'cafe', 'Fumbally Lane', 53.3363, -6.2730),
    ('Two Boys Brew', 'cafe', '375 North Circular Road, Phibsborough', 53.3605, -6.2725),
    ('Herbstreet', 'restaurant', 'Hanover Quay', 53.3430, -6.2365),
    -- Parks and outdoors
    ('St Stephen’s Green', 'park', 'Dublin 2', 53.3382, -6.2591),
    ('Phoenix Park', 'park', 'Dublin 8', 53.3559, -6.3298),
    ('Merrion Square', 'park', 'Dublin 2', 53.3396, -6.2493),
    ('Iveagh Gardens', 'park', 'Clonmel Street', 53.3355, -6.2620),
    ('Herbert Park', 'park', 'Ballsbridge', 53.3270, -6.2330),
    ('Grand Canal Dock', 'outdoor', 'Dublin 2', 53.3420, -6.2380),
    ('Sandymount Strand', 'beach', 'Sandymount', 53.3290, -6.2130),
    ('Dollymount Strand', 'beach', 'Bull Island, Clontarf', 53.3650, -6.1600),
    ('Dún Laoghaire Pier', 'outdoor', 'Dún Laoghaire', 53.2945, -6.1340),
    ('The Forty Foot', 'beach', 'Sandycove', 53.2890, -6.1135),
    ('Howth Harbour', 'outdoor', 'Howth', 53.3891, -6.0650),
    -- Streets and squares
    ('Grafton Street', 'street', 'Dublin 2', 53.3420, -6.2600),
    ('Temple Bar Square', 'street', 'Temple Bar', 53.3455, -6.2643),
    ('Camden Street', 'street', 'Dublin 2', 53.3353, -6.2650),
    ('Capel Street', 'street', 'Dublin 1', 53.3475, -6.2695),
    ('George’s Street Arcade', 'street', 'South Great George’s Street', 53.3423, -6.2642),
    ('Smithfield Square', 'street', 'Smithfield', 53.3478, -6.2786)
  ) as s(name, category, address, lat, lng)
  loop
    -- Skip a place that's already there, ignoring ’ versus ' in the name.
    continue when exists (
      select 1 from public.venues
      where lower(replace(name, '’', '''')) = lower(replace(v.name, '’', '''')));
    -- The venues table only allows its own category words, so try ours, then
    -- close matches, then the category most places already use.
    cats := case v.category
      when 'bar' then array['bar', 'pub']
      when 'club' then array['club', 'nightclub', 'nightlife', 'music', 'venue', 'bar', 'pub']
      when 'music' then array['music', 'live_music', 'venue', 'event', 'club', 'nightlife', 'bar', 'pub']
      when 'cafe' then array['cafe', 'café', 'coffee', 'restaurant', 'food']
      when 'restaurant' then array['restaurant', 'food', 'cafe', 'café']
      when 'park' then array['park', 'outdoor', 'outdoors', 'nature']
      when 'beach' then array['beach', 'outdoor', 'outdoors', 'park', 'nature']
      when 'outdoor' then array['outdoor', 'outdoors', 'park', 'nature']
      when 'street' then array['street', 'square', 'area', 'outdoor', 'outdoors', 'landmark']
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

select count(*) as places_on_the_map from public.venues;
