-- Third Space: "Delete my account".
-- Lets people delete their account and everything they've added, as GDPR
-- requires. Paste into Supabase → SQL Editor → New query and press Run.
-- It is safe to run more than once.

-- 1. People can delete their own anonymous photos too. Those live in the
--    shared "anon" folder, so the folder name doesn't say whose they are,
--    but Supabase still records who uploaded each one.
drop policy if exists "Users delete their own anonymous media" on storage.objects;
create policy "Users delete their own anonymous media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'anon' and owner_id = auth.uid()::text);

-- 2. Deletes the signed-in person's account and everything linked to it:
--    posts (with their comments, likes and saves), their own comments, likes,
--    saves, favourites, reports, blocks and profile. The app removes their
--    photos and videos from storage first.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t text;
begin
  if me is null then
    raise exception 'Sign in to delete your account.' using errcode = 'P0001';
  end if;

  -- Each table only if it exists, since not every setup step may have been run.
  foreach t in array array['comments', 'likes', 'saves', 'favourite_places', 'update_reads', 'reports', 'venue_accounts'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where user_id = $1', t) using me;
    end if;
  end loop;
  if to_regclass('public.blocks') is not null then
    delete from public.blocks where blocker_id = me or blocked_id = me;
  end if;
  delete from public.posts where user_id = me;
  delete from public.users where id = me;
  delete from auth.users where id = me;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
