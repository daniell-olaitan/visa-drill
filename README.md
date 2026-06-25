# VisaDrill

Practice high-stakes U.S. visa interviews with a hyperreal AI consular officer, powered by [Tavus CVI](https://docs.tavus.io) (Conversational Video Interface).

Interview tracks (the categories the frontend offers):

- **Visitor (B1/B2)** - tourism or short business
- **Student (F-1)**
- **Work (H-1B)**
- **Exchange (J-1)**

There's also a general "any" practice mode. (A USCIS **N-400 citizenship** officer exists in the backend but isn't exposed in the UI.)

> **Single service**: the FastAPI backend serves the Vite/React/shadcn SPA (in `client/`) and the Tavus-backed `/api`. The marketing landing is a 1:1 reproduction of the VisaDrill design (a `motion`-animated, scroll-pinned page with the Nexa/Mulish typeface), and the live officer is rendered with the **Daily SDK** (our own in-call UI). If the avatar can't start, a zero-config **browser simulator** takes over.

## How an interview works

1. **Practice** page → pick a visa category.
2. A brief **"I'm ready" briefing** screen (no form to fill in). The tap also unlocks iOS audio so the officer's voice can autoplay.
3. **Live interview** (`/interview`, full-screen): the Tavus officer rendered via the Daily SDK, with the officer video filling the card, your self-view as a PiP, **mic/camera** controls, **live captions (CC toggle)**, a **countdown that auto-ends**, and a **REC** indicator when recording is on.
4. **Debrief** (`/debrief`): a scored report (below).

The officer opens by asking the purpose of the trip; it does not ask for the applicant's name.

## Per-category officers

Each category maps 1:1 to a **dedicated Tavus persona** with its own grounded prompt and objectives (`backend/app/personas.py`; `CATEGORY_TO_VISA` in `backend/app/main.py`):

| Category | Officer focus |
|---|---|
| Visitor (B1/B2) | Purpose, itinerary, funding, **ties/return intent** (INA 214(b)) |
| Student (F-1) | School/program, funding, why-the-U.S., return intent |
| Work (H-1B) | Employer, specialty occupation, degree, salary - **dual-intent** (no ties/return pressure) |
| Exchange (J-1) | Program + sponsor (DS-2019), funding, ties, **212(e)** |
| `any` | Uses the Visitor officer |
| N-400 (citizenship) | Exists in the backend; not surfaced in the UI |

## Scored debrief

For a live interview, `/debrief` (`LiveDebrief.tsx`) fetches `/api/report/:id` and shows:

- a **verdict** + **approval-readiness score (0-100)**, with **progress vs. your last attempt**,
- **per-area scores** (purpose, ties, finances, and so on),
- **per-answer notes** (what landed / what to tighten), computed by reusing the simulator's free heuristic engine on the transcript; **unanswered questions count as zero**, so going silent tanks the score,
- the officer's **demeanor read** (Raven perception) and a **recording link** when available.

The scoring is local and free (no extra LLM call), and the browser simulator keeps its own local heuristic debrief.

## Tavus features used

| # | Feature | Notes |
|---|---|---|
| 1 | **Perception (Raven)** | Live awareness cues + end-of-call demeanor analysis |
| 2 | **Objectives** | A per-category objective set drives flow + structured output |
| 3 | **Recording** | Optional; copied to your own Azure/S3. Off by default |
| 4 | **Knowledge base (RAG)** | USCIS civics doc, attached to the **N-400** officer only (not the visa tracks) |
| 5 | **Guardrails** | Never coach/break character, block real PII, stay on topic |
| 6 | **Flow + STT** | Turn-taking, interruptibility, **idle re-engagement**, hotwords |
| 7 | **Memories** | Implemented (`memory_stores`) but **not currently wired** into the live embed flow |
| 8 | **Language** | Defaults to English; not yet a UI picker |
| 9 | **Pronunciation dictionary** | Correct TTS of "USCIS", "N-400", and similar terms |

Every feature degrades gracefully: if a Tavus resource fails to provision at startup, the backend logs a warning and boots without it.

## Models

Three Tavus models are in play: **Phoenix-4** renders the replica, **Raven-1** is perception, and **Sparrow-1** is turn-taking. Phoenix comes from the stock replica; Raven/Sparrow are set in the persona layers.

## Stack

| Layer | Technology |
|---|---|
| Frontend (`client/`) | Vite + React 18 + TypeScript + Tailwind + shadcn/ui + `@daily-co/daily-js`, with `motion` (Framer Motion) and the Nexa/Mulish fonts for the landing |
| Backend (`backend/`) | Python 3.11+ + FastAPI + httpx + Pydantic |
| Avatar | Tavus CVI: a dedicated Persona + stock Replica per category |

The landing also ships a light/dark theme toggle and an email waitlist form. Signups POST to `/api/waitlist`, which saves them to a Supabase `waitlist` table when configured and falls back to a local file otherwise (see [Waitlist](#waitlist)).

## Architecture

```
Browser (SPA served by FastAPI)              FastAPI (:8787)            Tavus API
  /interview (Live)
    │  POST /api/liveavatar/embed {category, applicant_context?} ─► POST /v2/conversations ─►
    │  ◄── { url, conversation_id, max_seconds, recording } ◄──────── ◄── conversation_url ──
    ▼
  Daily SDK joins the room  ◄════ WebRTC ════►  Tavus officer joins and speaks
  (officer video + self-view PiP + captions + countdown)
    │
  End / time up ─► /debrief ─► GET /api/report/:id ─► scored debrief + demeanor read
```

On startup the backend verifies the key, then provisions one dedicated **Persona** per visa type (`backend/app/personas.py`), each bound to a stock **Replica** and attached to its guardrails/objectives, caching ids by content hash. Set the `PERSONA_*_ID` env vars (from `scripts/provision.py`) to skip provisioning on ephemeral hosts.

The officer's opening line is a per-conversation `custom_greeting` read from `SPECS` at session start, so changing a greeting takes effect on the next interview without re-provisioning. Re-provision only when you change something baked into a persona (its system prompt, objectives, guardrails, documents, or layers).

## Prerequisites

- Node.js 20+ (the client build needs Node 20.19+/22 for Vite)
- Python 3.11+
- A Tavus API key with credit (from [platform.tavus.io](https://platform.tavus.io))

## Setup

1. **Configure your API key.** Copy `.env.example` to `.env` at the project root and set `TAVUS_API_KEY=...`.
2. **Install dependencies.**

   ```sh
   python3 -m venv backend/.venv && source backend/.venv/bin/activate
   pip install -r backend/requirements.txt
   npm install && npm --prefix client install
   ```

3. **Run both dev servers** (backend `:8787`, frontend `:8080`):

   ```sh
   npm run dev
   ```

   Vite proxies `/api` to the backend. (If `uvicorn` isn't on your PATH, run it yourself: `cd backend && uvicorn app.main:app --reload --port 8787`.)

4. **Open** [http://localhost:8080](http://localhost:8080) → Practice → pick a category → Start, and grant mic + camera. (`/interview?mode=sim` forces the offline simulator.) Note: live interviews spend Tavus minutes even locally; tune length with `INTERVIEW_DURATION_SECONDS`.

## Key env vars

| Var | Purpose |
|---|---|
| `TAVUS_API_KEY` | Required |
| `TAVUS_REPLICA_ID` | Stock replica (the officer's face); list with `GET /api/replicas` |
| `INTERVIEW_DURATION_SECONDS` | Visible interview length / auto-end (default 240) |
| `PERSONA_*_ID` (×5) | Pre-provisioned persona ids; set all to skip startup provisioning |
| `ENABLE_RECORDING`, `RECORDING_AZURE_*` / `RECORDING_*` (S3) | Optional recording |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Optional waitlist store (else a local file); see [Waitlist](#waitlist) |
| `DEFAULT_LANGUAGE`, `CIVICS_DOCUMENT_URL`, `PUBLIC_BASE_URL` | Optional |

Pre-provision once and pin the ids so cold starts don't recreate resources:

```sh
python backend/scripts/provision.py   # prints the five PERSONA_*_ID values
```

Paste the printed `PERSONA_*_ID` lines into `.env` locally and into your host's env (for example the Render dashboard), then restart or redeploy.

## Verify which features your Tavus account supports

```sh
python backend/scripts/verify_tavus.py                 # creates+deletes a probe of each resource
python backend/scripts/verify_tavus.py --skip-conversation
```

Conversation probes use `test_mode`, so they don't bill minutes. Prints `OK`/`FAIL` per feature (#1-#9).

## Deploy (free, single service on Render)

The `Dockerfile` builds the Vite frontend and serves it from FastAPI, so one free Render web service hosts everything. Its public URL auto-becomes the Tavus webhook base (`RENDER_EXTERNAL_URL`), so no ngrok is needed.

1. Push the repo to GitHub.
2. Render → **New → Blueprint** (reads `render.yaml`), or **Web Service → Docker**.
3. Set the `sync: false` env vars in the dashboard (`TAVUS_API_KEY`, `PERSONA_*_ID`, recording vars, and so on).
4. Deploy → live at `https://<name>.onrender.com`; `/api/health` is the health check and the SPA is at `/`.

Free-tier: spins down after about 15 min idle (roughly 30-60s cold start). With `PERSONA_*_ID` set, startup skips provisioning, so there are no duplicate resources.

## Recording storage (optional)

Tavus copies recordings into **your own** cloud via federated identity, either **Azure Blob** or **AWS S3** (Cloudflare R2 is *not* supported; S3 mode needs AWS IAM AssumeRole). Recording is off by default, and the debrief's transcript + demeanor work without it.

- **Azure:** `az login`, then `STORAGE_ACCOUNT=… RESOURCE_GROUP=… WORKSPACE_ID=<your Tavus Workspace ID> ./infra/azure/setup-recording.sh` (the federated-credential subject is your Tavus Workspace ID, so each Tavus account needs its own).
- **AWS:** `BUCKET=… REGION=… ./infra/aws/setup-recording.sh`

Recording only happens on a real interview. To see the recording link in the debrief, set `PUBLIC_BASE_URL` so Tavus can POST the `recording_ready` webhook.

## Waitlist

The landing form posts `{email}` to `POST /api/waitlist`. With `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` set, signups are inserted into a Supabase `waitlist` table (durable and exportable, dedupes on a unique email); without them they append to a local JSONL file (`WAITLIST_FILE`, default `waitlist.jsonl`), which is fine for dev but ephemeral on hosts without a persistent disk.

To use Supabase, create a free project and run this once in its SQL editor:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  joined_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;  -- service key bypasses RLS; anon cannot read
```

Then set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (the **service_role** key, server-side only) in `.env` and your host's env. Export signups any time from the Supabase Table editor.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Key status, active replica, persona ids (one per visa type) |
| GET | `/api/replicas` | List stock replicas |
| POST | `/api/liveavatar/embed` | `{category, applicant_context?}` -> `{url, conversation_id, max_seconds, recording}` |
| POST | `/api/start-session` | `{visa_type, language?, applicant_id?, conversational_context?}` -> `{conversation_url, conversation_id}` |
| POST | `/api/end-session` | `{conversation_id}` -> ends the conversation |
| POST | `/api/waitlist` | `{email}` -> `{data, error}`; stores to Supabase or a local file |
| GET | `/api/report/{conversation_id}` | Transcript + demeanor analysis + recording url |
| POST | `/api/webhook` | Receives Tavus events (transcript, perception, recording-ready) |

`GET /api/health` returns five persona ids: `b1b2`, `f1`, `h1b`, `j1`, `n400`.

## Code quality & tests

```sh
cd backend
pip install -r requirements-dev.txt
ruff check app/ tests/ scripts/
mypy app/ tests/ scripts/
pytest -q     # offline; mocks the Tavus client
```

The backend follows the repo Python conventions: full type hints, modern union syntax, Pydantic models, and the `logging` module (no `print`).

## Troubleshooting

- **"TAVUS_API_KEY is not set"** - create `.env` at the project root with a non-empty key.
- **Startup 401** - the Tavus key is invalid or revoked.
- **`embed`/`start-session` returns 502** - usually out of credits or an invalid `replica_id`/persona; the Tavus error body is logged.
- **Officer never appears and drops to the simulator** - the embed/Daily join failed; check the browser console and the backend log for the `POST /v2/conversations` response. A "Live officer unavailable" notice appears bottom-left.
- **No audio on iPhone** - tap the "Tap to hear the officer" button; iOS blocks autoplay until a gesture.
- **Idle calls billing** - conversations set `max_call_duration` + participant timeouts, and the client auto-ends at the countdown.

## Security note

The Tavus API key is **server-side only**; it lives in `.env` and is read by the FastAPI backend. The browser only talks to our own `/api/*` routes.
