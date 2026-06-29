# Deploy VisaDrill (Lovable + Supabase)

The app has two pieces that deploy separately:

- **Backend** - three **Supabase Edge Functions** (`supabase/functions/`) plus the `waitlist` table.
- **Frontend** - the Vite/React app at the repo root, hosted on **Lovable**.

Do **Part A (Supabase) first**, because the frontend needs the backend live to talk to.

| Function | Does |
|---|---|
| `start-session` | creates a provider conversation, returns the room URL |
| `report` | fetches and parses the interview transcript |
| `waitlist` | stores a signup in the `waitlist` table |

---

## Part A - Supabase backend

You will use the existing project **`tbuaxywxkiyodvoihrhn`** (it already has the `waitlist` table). `supabase/config.toml` already points at it.

### A1. Install the Supabase CLI and log in

```sh
npm install -g supabase     # or: brew install supabase/tap/supabase
supabase login              # opens a browser to authorize
supabase link --project-ref tbuaxywxkiyodvoihrhn
```

### A2. Set the function secrets

Run this from the repo root, filling in the API key. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically, so do not add them.

```sh
supabase secrets set \
  AVATAR_API_KEY=<your provider API key> \
  PERSONA_B1B2_ID=p7901663e42f \
  PERSONA_F1_ID=pcf6c09219cd \
  PERSONA_H1B_ID=p576112bb01f \
  PERSONA_J1_ID=p4ad8e7a0f63 \
  PERSONA_N400_ID=p924d7278f82 \
  AVATAR_REPLICA_ID=rfb0463909e3 \
  INTERVIEW_DURATION_SECONDS=240
```

(Dashboard alternative: Edge Functions -> Manage secrets -> add each one.)

### A3. Deploy the functions

```sh
supabase functions deploy start-session
supabase functions deploy report
supabase functions deploy waitlist
```

### A4. Confirm the waitlist table exists

It already does. To recreate it, run this in Dashboard -> SQL Editor:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  joined_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;  -- the service role bypasses RLS
```

### A5. Smoke-test

```sh
curl -X POST "https://tbuaxywxkiyodvoihrhn.supabase.co/functions/v1/start-session" \
  -H "Content-Type: application/json" -H "apikey: <ANON_KEY>" \
  -d '{"category":"b1b2"}'
# expect: { "url": "...", "conversation_id": "...", "max_seconds": 240 }
```

---

## Part B - Frontend on Lovable

The repo already meets Lovable's import requirements: a Vite + React/TypeScript app with a single `package.json` at the root, a working `dev` script, no monorepo, and Tailwind v3.

### B1. Connect your GitHub account

In Lovable: **Settings -> Connectors -> GitHub -> Connect**. Authorize the **Lovable GitHub App** and give it access to the `visa-drill` repository.

### B2. Import the repo

In Lovable: **New Project -> Import from GitHub**, then pick **`daniell-olaitan/visa-drill`**. Lovable creates a project with two-way sync on the `main` branch (commits you push to GitHub sync into Lovable, and vice versa).

### B3. Set the frontend env vars

Your local `.env` does not transfer. In the Lovable project, open the **Cloud / project settings (env vars)** panel and add these two **public** values:

```
VITE_SUPABASE_URL=https://tbuaxywxkiyodvoihrhn.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / publishable key for that project>
```

Get the anon key from the Supabase Dashboard -> Settings -> API -> Project API keys -> `anon` `public`. (The same values are in your local `.env`.)

### B4. Check the preview

Watch the build/preview in Lovable. If it fails, the log usually points at a missing dependency or import path. The build should succeed as-is.

### B5. Publish and attach the domain

1. Click **Publish** (top right). The app goes live on a `*.lovable.app` URL.
2. In the publish dialog (or **Settings -> Domains**), choose **Connect domain**, enter your domain, and follow Lovable's DNS instructions. Since the domain is already on Lovable, you just attach it to this project.

---

## Verify end to end

- Your domain loads the landing page.
- The waitlist form accepts an email (check the `waitlist` table fills in Supabase).
- Practice -> start an interview -> the officer connects (the live call is browser to provider over WebRTC; the functions only start the session and fetch the debrief).

---

## Notes

- **Provisioning** the officer personas is a one-time job done with the original Python backend, archived at `../visadrill-fastapi-backend/`. The ids above are already created, so you only re-run it after changing a persona prompt or switching provider accounts.
- The Python/FastAPI backend was moved out of the repo, not deleted.
