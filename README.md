# VocabRise

A responsive English vocabulary learning app built with Next.js, TypeScript, Supabase Auth, and PostgreSQL. Supports username/password accounts, per-user cloud progress, an admin activity dashboard, light/dark theme, and the watermark `© 2026 VocabRise | Igoo`.

## Features
- Username + password registration/login (no email field in the app UI).
- Individual cloud-saved learned words, timestamps, daily target, and theme.
- Shared vocabulary catalogue with V1/V2/V3, Indonesian meaning, examples, and speech synthesis.
- Previous/Next study flow, review/history, and editable daily goal.
- Admin-only user list, learned-word counts, and latest activity log.
- Row Level Security (RLS) separates each user's progress and settings.

## Important note about username login
Supabase Auth natively authenticates using email/password. To present a username-only form, VocabRise maps each username to an internal synthetic address like `masigoo@users.vocabrise.app`. Users should use the same username to log in; they do not enter an email in the app. This setup does not support email-based password recovery. For a production public app, consider adding a real verified email or a trusted server-side username-auth flow.

## 1. Run locally
Requires Node.js 18.17+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows, create `.env.local` by copying `.env.example` in File Explorer or VS Code if `cp` is unavailable.

## 2. Configure Supabase
1. Create a Supabase project.
2. In **Project Settings → API** (or Connect), copy the Project URL and the **publishable/anon public key** into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

3. In Supabase **Authentication → Providers → Email**, turn **Confirm email OFF** for this username-only prototype. Otherwise signup may require email confirmation even though the UI does not collect a real email address.
4. In **SQL Editor**, run the full `supabase/schema.sql`.
5. Run `supabase/seed.sql` to seed the shared vocabulary catalogue. If it was already seeded, do not run it repeatedly unless you have checked duplicate-key errors; the seed inserts fixed IDs.
6. Restart local Next.js after changing `.env.local`.

Never put a `service_role` or secret API key in a `NEXT_PUBLIC_` variable, and never commit `.env.local`.

## 3. Create the first admin
1. Start the app and register the account that should be the owner/admin (for example, username `masigoo`).
2. In Supabase **SQL Editor**, run this query, replacing the username with the exact one you registered:

```sql
update public.profiles
set role = 'admin'
where username = 'masigoo';
```

3. Log out and log back in. The **Admin · Aktivitas** menu should appear.

Only promote trusted accounts to admin. The client cannot change its own role; role changes are managed in Supabase SQL Editor.

## 4. Admin activity dashboard
The admin page shows registered usernames, roles, registration date, learned-word counts, last activity, and up to 150 recent activity logs. Events include login, start learning, learned/unlearned word, finishing a session, and clearing progress. It is not a hidden surveillance tool: users should be informed that their learning activity is recorded for app administration.

## 5. Deploy to Vercel
1. Commit and push the project to GitHub.
2. Import the repository at https://vercel.com/new.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables.
4. Deploy or redeploy.
5. If the app is already deployed, pushing new commits to the connected GitHub branch will trigger a new deployment.

## Data and privacy
- Each account's progress and settings are stored in Supabase.
- RLS policies restrict members to their own progress and settings. Admins can read user profiles, progress, and activity logs, but cannot modify another user's progress through the client.
- Shared vocabulary is readable by all visitors; write policies for the public role are not enabled.
- Since username-only authentication uses a synthetic address, there is no email-based password reset. Keep the initial admin credentials secure.

## Project structure
```text
app/                 Next.js app and global styles
components/AuthScreen.tsx  username/password registration and login
lib/supabase.ts      Supabase client
lib/words.ts         remote catalogue + bundled fallback
lib/vocabulary.json bundled vocabulary
supabase/schema.sql  vocabulary, profiles, progress, settings, activity, RLS
supabase/seed.sql    shared vocabulary seed
.env.example         environment template
```
