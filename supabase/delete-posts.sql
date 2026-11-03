-- Third Space: delete your own posts.
-- (Deleting your own comments already works.) Paste into Supabase →
-- SQL Editor → New query and press Run. It is safe to run more than once.

-- Deletes one of the signed-in person's own posts, with its comments, likes
-- and saves, and returns the address of its photo or video so the app can
-- remove that file too. Anyone else's post is left alone.
create or replace function public.delete_my_post(target_post text) returns text
language plpgsql security definer set search_path = public as $$
declare
  url text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete posts.' using errcode = 'P0001';
  end if;
  delete from public.posts where id::text = target_post and user_id = auth.uid()
    returning media_url into url;
  if not found then
    raise exception 'You can only delete your own posts.' using errcode = 'P0001';
  end if;
  return url;
end $$;
revoke execute on function public.delete_my_post(text) from public, anon;
grant execute on function public.delete_my_post(text) to authenticated;
