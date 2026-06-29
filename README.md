# VisaDrill

Practice high-stakes U.S. visa interviews with a hyperreal AI consular officer, then get an honest, scored debrief - so the real interview feels like your second time.

> **Backend:** Supabase Edge Functions (`supabase/functions/`) + Supabase Postgres, with the Vite SPA on Lovable. See **[DEPLOY_LOVABLE.md](DEPLOY_LOVABLE.md)**. The original FastAPI backend is archived outside the repo. (Some sections below still describe that backend - a fuller rewrite is pending.)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-beta-blue)

Interview tracks:

- **Visitor (B1/B2)** - tourism or short business
- **Student (F-1)**
- **Work (H-1B)**
- **Exchange (J-1)**

Plus a general "any" practice mode. (A USCIS **N-400 citizenship** officer exists in the backend but isn't surfaced in the UI.)

> **Single service**: the backend serves the React single-page app and the REST `/api`. The marketing landing is a motion-animated, scroll-pinned page; the live officer is a real-time talking avatar streamed over WebRTC with a custom in-call UI. If the avatar can't start, a zero-config **browser simulator** takes over.

## How an interview works

1. **Practice** page -> pick a visa category.
2. A brief **"I'm ready" briefing** screen (no form to fill in). The tap also unlocks iOS audio so the officer's voice can autoplay.
3. **Live interview** (`/interview`, full-screen): the AI officer over WebRTC, with the officer video filling the card, your self-view as a PiP, **mic/camera** controls, **live captions (CC toggle)**, and a **countdown that auto-ends**.
4. **Debrief** (`/debrief`): a scored report (below).

The officer opens by asking the purpose of the trip; it does not ask for the applicant's name.

## Per-category officers

Each category maps 1:1 to a dedicated AI persona with its own grounded prompt and objectives (`backend/app/personas.py`; `CATEGORY_TO_VISA` in `backend/app/main.py`):

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
- **per-answer notes** (what landed / what to tighten), computed by a free local heuristic on the transcript; **unanswered questions count as zero**, so going silent tanks the score.

Scoring is local and free (no extra LLM call), and the browser simulator keeps its own local heuristic debrief.

## Conversational-video capabilities

The live officer runs on a real-time conversational-video AI, configured for:

- **Visual perception** - awareness cues during the call.
- **Objectives** - a per-category objective set drives the interview flow.
- **Guardrails** - never coach or break character, block real PII, stay on topic.
- **Turn-taking + speech-to-text** - interruptibility, idle re-engagement, domain hotwords.
- **Knowledge base** - a USCIS civics document grounds the citizenship officer only.
- **Memory, language, and pronunciation tuning.**

Three models work together end to end: one renders the avatar, one reads visual cues, one handles turn-taking. Every capability degrades gracefully - if a resource fails to provision at startup, the backend logs a warning and boots without it.

## Stack

| Layer | Technology |
|---|---|
| Frontend (`client/`) | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui, with Framer Motion for the landing |
| Backend (`backend/`) | Python 3.11+ + FastAPI + httpx + Pydantic |
| Realtime | WebRTC (the officer's audio + video) |
| Storage | Postgres for the waitlist (optional; falls back to a local file) |

The landing also ships a light/dark theme toggle and an email waitlist form (see [Waitlist](#waitlist)).

## Architecture

<img src="https://raw.githubusercontent.com/daniell-olaitan/visa-drill/main/docs/architecture.svg" alt="VisaDrill architecture: the browser SPA talks to the API backend over REST and joins the conversational-video AI directly over WebRTC; the backend stores waitlist signups in Postgres." width="100%">

The browser loads the SPA from the backend, calls the REST `/api` for everything, and joins the officer's room **directly over WebRTC** (low latency, the API key never reaches the browser). On startup the backend provisions one dedicated persona per visa type, caching ids by content hash; pin the persona ids in your env to skip provisioning on ephemeral hosts. The officer's opening line is a per-conversation greeting read at session start, so changing it takes effect on the next interview without re-provisioning - re-provision only when you change something baked into a persona (its system prompt, objectives, guardrails, documents, or layers).

## Prerequisites

- Node.js 20+ (the client build needs Node 20.19+/22 for Vite)
- Python 3.11+
- An API key for the conversational-video provider (with credit)

## Setup

1. **Configure your keys.** Copy `.env.example` to `.env` at the project root and fill in the values - the file documents each variable.
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

   The dev server proxies `/api` to the backend. (If `uvicorn` isn't on your PATH: `cd backend && uvicorn app.main:app --reload --port 8787`.)

4. **Open** [http://localhost:8080](http://localhost:8080) -> Practice -> pick a category -> Start, and grant mic + camera. (`/interview?mode=sim` forces the offline simulator.) Live interviews spend provider minutes even locally; tune length with `INTERVIEW_DURATION_SECONDS`.

Pre-provision once and pin the persona ids so cold starts don't recreate resources:

```sh
python backend/scripts/provision.py   # prints the persona ids to pin in your env
```

## Deploy

The `Dockerfile` builds the frontend and serves it from the backend, so **one container hosts everything**. Deploy the image to any Docker-capable host, set the env vars from `.env.example`, and use `/api/health` as the health check. An infrastructure blueprint is included for blueprint-style hosts. With the persona ids pinned, startup skips provisioning, so cold starts never duplicate resources.

## Waitlist

The landing form posts `{email}` to `POST /api/waitlist`. With database credentials set, signups are inserted into a `waitlist` table (durable, dedupes on a unique email); otherwise they append to a local JSONL file (`WAITLIST_FILE`, default `waitlist.jsonl`), which is fine for dev but ephemeral on hosts without a persistent disk.

Create the table once in your database:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  joined_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;  -- the service key bypasses RLS; anon cannot read
```

To read signups via the API, set `ADMIN_TOKEN` and call `GET /api/waitlist` with an `X-Admin-Token: <token>` header (newest first). Without `ADMIN_TOKEN`, that endpoint returns 404.

```sh
curl -s https://<host>/api/waitlist -H "X-Admin-Token: $ADMIN_TOKEN"
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service status, active avatar, persona ids (one per visa type) |
| GET | `/api/replicas` | List available officer faces |
| POST | `/api/liveavatar/embed` | `{category, applicant_context?}` -> `{url, conversation_id, max_seconds}` |
| POST | `/api/start-session` | `{visa_type, language?, applicant_id?, conversational_context?}` -> `{conversation_url, conversation_id}` |
| POST | `/api/end-session` | `{conversation_id}` -> ends the conversation |
| POST | `/api/waitlist` | `{email}` -> `{data, error}`; stores to the database or a local file |
| GET | `/api/waitlist` | Admin-only signup list; needs `ADMIN_TOKEN` + `X-Admin-Token` header |
| GET | `/api/report/{conversation_id}` | Interview transcript |
| POST | `/api/webhook` | Receives provider events (transcript, perception) |

## Code quality & tests

```sh
cd backend
pip install -r requirements-dev.txt
ruff check app/ tests/ scripts/
mypy app/ tests/ scripts/
pytest -q     # offline; the video client is mocked
```

The backend follows the repo Python conventions: full type hints, modern union syntax, Pydantic models, and the `logging` module (no `print`).

## Troubleshooting

- **"API key is not set"** - create `.env` at the project root with a non-empty key.
- **Startup 401** - the provider key is invalid or revoked.
- **`embed`/`start-session` returns 502** - usually out of credits or an invalid avatar/persona; the error body is logged.
- **Officer never appears and drops to the simulator** - the live join failed; check the browser console and the backend log. A "Live officer unavailable" notice appears bottom-left.
- **No audio on iPhone** - tap the "Tap to hear the officer" button; iOS blocks autoplay until a gesture.
- **Idle calls billing** - conversations set a max duration + participant timeouts, and the client auto-ends at the countdown.
- **Switching provider accounts** - delete `backend/.cache/` first, then re-provision. The cache keys created resource ids by content hash, not by account, so a new key would reuse the old account's ids and the persona create would fail.

## Security

The provider and database keys are **server-side only** - they live in `.env` and are read by the backend. The browser only talks to the app's own `/api/*` routes.
