# VocabRise

A responsive English vocabulary-learning app built with Next.js, TypeScript, and optional Supabase PostgreSQL vocabulary storage. This edition intentionally has **no login**; progress, target, and theme are stored in `localStorage` on the current browser/device.

## Features
- Dashboard with live local date/time, daily target, words learned today, total learned, and collection progress.
- Study sessions with V1/V2/V3, Indonesian meaning, example sentence, browser speech synthesis, Previous/Next, and learned checkbox.
- Finish-session summary and review link.
- Vocabulary search and filters; history includes the exact date/time a word was marked learned.
- Editable daily target, light/dark theme, responsive desktop/mobile UI.
- Offline bundled vocabulary fallback; optionally load the shared catalogue from Supabase.

## Vocabulary seed
`lib/vocabulary.json` currently contains **785 curated entries** (common verbs, nouns, and adjectives). Verbs have V1/V2/V3 where applicable; nouns/adjectives display `—` in the verb columns. The user request mentioned 1,500–2,000 words; this first bundled seed is smaller rather than padding the list with unverified translations. You can add more reviewed entries in the same JSON format and regenerate SQL using `python make_seed.py` after editing its source lists.

> Translation and example quality should be reviewed before using this as formal learning material. A few example sentences are intentionally simple templates and may not be idiomatic for every part of speech.

## Run locally
Requires Node.js 18.17+.

```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Optional Supabase setup
The app works without Supabase. Without env variables, it uses the bundled JSON catalogue and stores progress locally.

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` (seeds the bundled vocabulary list).
4. Copy `.env.example` to `.env.local`, then set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Use only the Supabase **anon/public** key in a browser app; never put a service-role key in a `NEXT_PUBLIC_` variable. The RLS policy permits public read-only access to vocabulary. It intentionally provides no anonymous write policy.

## Deploy to Vercel
1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and deploy.
3. If using Supabase, add the two environment variables above under **Project Settings → Environment Variables** and redeploy.
4. If no Supabase variables are configured, VocabRise still runs using the bundled data.

## Data / privacy notes
- The app does not implement Supabase Auth because this selected version is no-login.
- Learned words, learned timestamps, daily target, and theme are stored in the current browser's local storage. They do not sync to another device or browser, and clearing browser data can remove them.
- The date/time shown is the visitor's local device time.
- To support cross-device syncing securely, add Supabase Auth and a `user_progress` table with per-user RLS policies in a later version.

## Project structure
```text
app/                 Next.js page and global styles
components/           (reserved for future shared UI components)
lib/types.ts          shared TypeScript types
lib/supabase.ts       optional Supabase client
lib/words.ts          remote catalogue + local fallback
lib/vocabulary.json   bundled seed catalogue
supabase/schema.sql   PostgreSQL schema and read-only RLS
supabase/seed.sql     SQL insert seed
.env.example          environment template
```
