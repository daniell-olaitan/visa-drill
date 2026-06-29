# Deploy VisaDrill (Lovable + Supabase)

The app is now Lovable-native: a **Vite/React frontend** plus a **Supabase**
backend. There is no Python at runtime - the backend is three **Supabase Edge
Functions** (TypeScript/Deno) in `supabase/functions/`:

| Function | Replaces | Does |
|---|---|---|
| `start-session` | `POST /api/liveavatar/embed` | creates a provider conversation, returns the room URL |
| `report` | `GET /api/report/:id` | fetches + parses the interview transcript |
| `waitlist` | `POST /api/waitlist` | stores a signup in the `waitlist` table |

The live interview is browser-to-provider over WebRTC, so the functions are only
hit to start a call and to fetch the debrief - both quick.

---

## 1. Supabase project

Use the existing project **`tbuaxywxkiyodvoihrhn`** (the one with the `waitlist`
table). The `supabase/config.toml` already points at it.

### Function secrets

Set these on the project (Dashboard -> Edge Functions -> Manage secrets, or the
CLI). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically -
do **not** add them.

```sh
supabase link --project-ref tbuaxywxkiyodvoihrhn
supabase secrets set \
  AVATAR_API_KEY=REDACTED \
  PERSONA_B1B2_ID=p7901663e42f \
  PERSONA_F1_ID=pcf6c09219cd \
  PERSONA_H1B_ID=p576112bb01f \
  PERSONA_J1_ID=p4ad8e7a0f63 \
  PERSONA_N400_ID=p924d7278f82 \
  AVATAR_REPLICA_ID=rfb0463909e3 \
  INTERVIEW_DURATION_SECONDS=240
```

### Deploy the functions

```sh
supabase functions deploy start-session
supabase functions deploy report
supabase functions deploy waitlist
```

(Lovable's Supabase integration can also create/deploy these from the repo.)

### Waitlist table

Already created. If you ever recreate it:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  joined_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;  -- the service role bypasses RLS
```

### Smoke-test a function

```sh
curl -X POST "https://tbuaxywxkiyodvoihrhn.supabase.co/functions/v1/start-session" \
  -H "Content-Type: application/json" -H "apikey: <ANON_KEY>" \
  -d '{"category":"b1b2"}'
# -> { "url": "...", "conversation_id": "...", "max_seconds": 240 }
```

---

## 2. Frontend env

The frontend needs two **public** values (set them in Lovable's project env, and
in `client/.env` for local dev):

```
VITE_SUPABASE_URL=https://tbuaxywxkiyodvoihrhn.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / publishable key for that project>
```

Get the anon key from Dashboard -> Settings -> API -> Project API keys -> `anon` `public`.

---

## 3. Host on Lovable + domain

1. Connect this GitHub repo to your Lovable project (or import it).
2. Set the two `VITE_*` env vars above in Lovable.
3. Publish, then attach your Lovable domain.

> **Frontend location:** the Vite app currently lives in `client/`. If Lovable
> expects the app at the repo root, tell me and I'll flatten `client/` to the
> root (move `client/*` up and adjust the config) so Lovable detects it cleanly.

---

## Notes

- **Provisioning** (creating the officer personas) stays a one-time job done with
  the Python backend (now archived at `../visadrill-fastapi-backend/`). The ids
  are already created and pinned above, so you do not need to run it again unless
  you change a persona prompt or switch provider accounts.
- The Python/FastAPI backend was moved out of the repo, not deleted - see the
  archive folder if you ever want to run it again.
