# Third Space

What's happening in Dublin, right now. People post photos and videos from venues, parks and streets, tag the vibe (Lit, Busy, Chill or Dead), and others can see it on the feed and the map.

## What's in the app

- **Home:** venue stories, a cover story for the most talked-about spot tonight, and a Pinterest-style grid you can filter by vibe.
- **Map:** every venue on a real Dublin map, coloured by its latest vibe. Tap a pin to see what's happening there.
- **+ (post):** share a photo or video, choose the venue and vibe, and decide whether people can comment.
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
