# Third Space

What's happening in Dublin, right now. People post photos and videos from venues, parks and streets, tag the vibe (Lit, Busy, Chill or Dead), and others can see it on the feed and the map.

## What's in the app

- **Home:** venue stories, a cover story for the most talked-about spot tonight, and a Pinterest-style grid you can filter by vibe.
- **Map:** every venue on a real Dublin map, coloured by its latest vibe. Search by name or interest ("indian food", "chill walk", comedy, tourist spots), or tap a pin to see what's happening there.
- **+ (post):** share a photo or video, choose the venue and vibe, decide whether people can comment, and optionally post anonymously for a few hours or forever. Videos over 50 MB are shrunk on the phone before uploading. Before anything uploads, the app makes a clean copy without the hidden details phones store inside photos and videos, like the GPS spot where they were taken.
- **Surprise me tonight (Home):** pick some interests and get one place to go, weighted by what’s live right now.
- **Updates (bell, top right):** favourite any place with ☆ and see new posts from your places, with a count of what’s new.
- **Fair posting:** everyone can post at most twice per place per hour. Posts from venue staff show a **Venue** label.
- **Word filter:** captions and comments can't include slurs, threats or phone numbers.
- **Delete my account (bottom of Profile):** deletes the person's account and everything they added, including photos and videos, as GDPR requires.
- **Report and block (bottom of every post):** report a post with a reason, or block the person who posted it. You stop seeing what you reported or blocked straight away. A post with 3 reports hides for everyone until a moderator checks it. Anonymous posts can be reported but not blocked, so blocking never gives away who posted them.
- **Journal:** written reviews of Dublin places with star ratings.
- **Profile:** your posts and the posts you've saved, plus sign in and sign out.

Until there are real posts in the database, the app shows sample posts so it never looks empty.

## How it fits together

| Piece | What it does |
| --- | --- |
| **React + Vite** (`src/`) | The screens people see and tap. |
| **Supabase** | The database (venues, posts, comments, likes, saves, journal), sign-in, and file storage for photos and videos. |
| **Vercel** | Builds the app from this repo and puts it online. Every change pushed here goes live in a minute or two. |

## Setting up Supabase (once)

1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole of `supabase/schema.sql` and press **Run**. It adds the comments, likes, saves and journal tables, the storage space for photos and videos, and the first four journal reviews. It is safe to run again.
3. Then paste and run `supabase/anonymous-posts.sql`. It hides who made anonymous posts, so nobody can tell where someone is in real time.
4. Then paste and run `supabase/favourite-places.sql`. It stores each person's favourite places for Updates.
5. Then paste and run `supabase/place-tags.sql`. It adds interest words to places for search, plus Indian restaurants, comedy clubs and tourist spots.
6. Then paste and run `supabase/report-block.sql`. It switches on reporting and blocking, and hides a post after 3 reports.
7. Then paste and run `supabase/venue-rules.sql`. It adds venue accounts and limits everyone to two posts per place per hour.
8. Then paste and run `supabase/word-filter.sql`. It stops captions and comments with slurs, threats or phone numbers.
9. Then paste and run `supabase/delete-account.sql`. It makes the "Delete my account" button on Profile work.

## The word filter

Captions and comments with slurs, threats or phone numbers are refused, with a message saying what to change. Simple disguises like "k1ll y0urself" are caught too. To add or remove words, open **Table Editor → blocked_words** in Supabase. Use lowercase letters and spaces only, and set `kind` to `slur` or `threat`. Whole words only, so "knackered" and "Negroni" are fine.

## Venue accounts

Venue staff can have their own account that posts vibes for their venue. Their posts show a **Venue** label, they can't post anonymously, and they can only post at their own venue, so nobody can fake vibes or trash a rival.

To make an account a venue account: the staff member signs up as normal. Then in Supabase, copy their user id from **Authentication → Users**, open **Table Editor → venue_accounts → Insert row**, and fill in `user_id` and the venue's `venue_id` (from the **venues** table). Delete the row to turn it back into a normal account.

## Checking reports (moderators)

In Supabase, open **Table Editor → report_queue**. Each row is a reported post with how many reports it has and why. A post with 3 or more reports is already hidden (it has a `hidden_at` time).

- **It's fine:** open the post in the **posts** table, clear `hidden_at` and tick `checked_ok`. It comes back and won't hide again.
- **It breaks the rules:** delete the post in the **posts** table. `poster` in report_queue is the account behind it, even for anonymous posts, if you need to ban someone.

## Setting up Vercel (once)

1. In the Vercel project, open **Settings → Build and Deployment** and set **Framework Preset** to **Vite**.
2. Open **Settings → Environment Variables** and add the two values from Supabase → **Project Settings → API**:
   - `VITE_SUPABASE_URL`: the Project URL
   - `VITE_SUPABASE_ANON_KEY`: the anon public key
3. Redeploy.

Without those two values the app still runs, but only with sample data.

## Running it on a computer (optional)

```bash
npm install
cp .env.example .env   # then fill in the two values
npm run dev
```
