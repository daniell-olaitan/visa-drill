# face-drill

Practice high-stakes U.S. immigration interviews with a realistic AI consular officer, powered by [Tavus CVI](https://docs.tavus.io) (Conversational Video Interface).

Three interview modes:

- **Tourist Visa (B1/B2)** - consular interview, ~3 minutes
- **Student Visa (F-1)** - consular interview, ~4 minutes
- **Citizenship (N-400)** - USCIS naturalization interview, ~6 minutes

> **Single service**: the FastAPI backend serves the real FaceDrill SPA (the
> `jedidiah-oladele/facedrill` Vite/React/shadcn app, in `client/`) and provides the
> Tavus-backed `/api`. The interview's hyperreal officer is rendered by **Tavus CVI**
> (the frontend embeds the Tavus `conversation_url` through its existing avatar-embed
> contract); the built-in browser **simulator** remains the zero-config fallback.

## Tavus features used

| # | Feature | What it does here | Where |
|---|---|---|---|
| 1 | **Perception (Raven)** | Officer "sees" the applicant; live awareness cues + an end-of-call demeanor analysis (eye contact, nervousness) | `personas.py` `layers.perception` |
| 2 | **Objectives** | Goal-driven flow + structured scoring per section / civics | `objectives.py` |
| 3 | **Recording + transcript** | Optional session recording (S3) and full transcript surfaced in the report | `start-session` properties, `/api/report` |
| 4 | **Knowledge base (RAG)** | N-400 civics grounded in the official USCIS 100 questions | `documents.py` |
| 5 | **Guardrails** | Hard-enforce: never coach/break character, block real PII, stay on topic | `guardrails.py` |
| 6 | **Flow + STT hotwords** | Officer can interrupt rambling answers; accurate capture of visa terms/names | `personas.py` `layers.conversational_flow` / `stt` |
| 7 | **Memories** | Cross-session memory keyed per applicant (progress across attempts) | `start-session` `memory_stores` |
| 8 | **Language support** | Practice in 40+ languages or English-proficiency mode | `properties.language` (default english) |
| 9 | **Pronunciation dictionary** | Correct TTS of "USCIS", "N-400", etc. | `pronunciation.py` |

Each feature degrades gracefully: if a Tavus resource fails to provision at startup
(e.g. an account without that capability), the backend logs a warning and boots
without it rather than failing.

The post-interview **debrief** (`/debrief`, `LiveDebrief.tsx`) shows the demeanor
analysis, transcript, and recording link for live sessions. It pulls from the verbose
conversation on demand (so it works without a public webhook); set `PUBLIC_BASE_URL`
to also receive events via `POST /api/webhook`.

## Stack

| Layer | Technology |
|---|---|
| Frontend (`client/`) | Vite + React 18 + TypeScript + Tailwind + shadcn/ui (the real FaceDrill app); optional Supabase waitlist |
| Backend (`backend/`) | Python 3.11+ + FastAPI + httpx + Pydantic |
| Avatar | Tavus CVI: Persona + stock Replica, embedded via `conversation_url` |

## Architecture

```
Browser (SPA served by FastAPI)            FastAPI (:8787)              Tavus API
  /interview (Live)
        │  POST /api/liveavatar/embed {category} ─►  POST /v2/conversations ─►
        │  ◄── { url, conversation_id } ◄───────────  ◄── conversation_url ───
        ▼
  iframe(url)  ◄═══ WebRTC (Daily, in-iframe) ═══►  Tavus officer joins, speaks
        │
  End ─► /debrief ─► GET /api/report/:id ─►  transcript + demeanor analysis
```

- The frontend's `category` (b1b2/f1/h1b/j1/any) maps to a backend persona
  (`backend/app/main.py`): `b1b2` is a **general nonimmigrant officer** that adapts
  to the category via injected `conversational_context` (so h1b/j1/any are handled by
  one officer that asks employer/program-appropriate questions); `f1` keeps a
  dedicated student officer.
- **Live debrief** (`/debrief`): for Tavus sessions the page fetches `/api/report/:id`
  and shows the demeanor analysis + transcript. The browser simulator keeps its own
  local heuristic debrief. If the avatar embed fails (no key, network), the interview
  falls back to the simulator automatically.

On startup the backend verifies the key, then provisions one **Persona** per visa
type (`backend/app/personas.py`) bound to a stock **Replica**, caching ids by content
hash. Set the `PERSONA_*_ID` env vars (from `scripts/provision.py`) to skip
provisioning entirely on ephemeral hosts.

## Prerequisites

- Node.js 20+
- Python 3.11+
- A Tavus API key with credit (from [platform.tavus.io](https://platform.tavus.io))

## Setup

1. **Configure your API key.** Copy `.env.example` to `.env` at the project root:

   ```sh
   cp .env.example .env
   # then edit .env and set TAVUS_API_KEY=...
   ```

2. **Install dependencies.**

   ```sh
   # backend (a virtualenv is recommended)
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   pip install -r backend/requirements.txt

   # frontend + root tooling
   npm install
   npm --prefix client install
   ```

3. **Run both dev servers** (backend on `:8787`, frontend on `:8080`):

   ```sh
   npm run dev
   ```

   `npm run dev` runs `uvicorn app.main:app` and Vite together; the Vite dev server
   proxies `/api` to the backend. If you are not using a venv on your PATH, run the
   backend yourself with `cd backend && uvicorn app.main:app --reload --port 8787`.

4. **Open** [http://localhost:8080](http://localhost:8080), go to Practice → Start, and grant microphone + camera permission. (`/interview?mode=sim` forces the offline simulator.)

## Choosing the interviewer face (replica)

The interviewer uses a Tavus **stock replica**, set by `TAVUS_REPLICA_ID` in `.env`
(defaults to a stock replica). To see what is available on your account:

```sh
curl http://localhost:8787/api/replicas
# [{ "replica_id": "...", "replica_name": "..." }, ...]
```

Pick one, set `TAVUS_REPLICA_ID=...` in `.env`, and restart. Changing the replica
changes the persona hash, so the personas are re-created automatically.

## Verify which features your Tavus account supports

The free Basic plan may gate some features. Once `.env` has your key, probe the
account: the script creates a throwaway instance of each resource, reports which
succeed, and cleans them up. Conversation probes use `test_mode`, so they do not
bill minutes.

```sh
python backend/scripts/verify_tavus.py
python backend/scripts/verify_tavus.py --skip-conversation   # skip the test_mode calls
python backend/scripts/verify_tavus.py --keep                # leave created resources
```

It prints an `OK` / `FAIL` line per feature (#1-#9). Whatever a given account
rejects, the server already skips gracefully at startup.

## Deploy (free, single service on Render)

The `Dockerfile` builds the Vite frontend and serves it from FastAPI, so one free
Render web service hosts everything. Its public URL also becomes the Tavus webhook
base automatically (Render injects `RENDER_EXTERNAL_URL`), so no ngrok is needed.

1. Push this `face-drill/` directory to a Git repo (GitHub/GitLab).
2. On [Render](https://render.com): **New -> Blueprint**, select the repo (it reads
   `render.yaml`). Or **New -> Web Service -> Docker** and point at the `Dockerfile`.
3. Set the secret env vars in the dashboard: `TAVUS_API_KEY`, and the
   `RECORDING_AZURE_*` values (the non-secret ones are pre-filled by `render.yaml`).
4. Deploy. The app comes up at `https://<name>.onrender.com`; `/api/health` is the
   health check, and the SPA is served at `/`.

Free-tier notes:
- The service spins down after ~15 min idle and cold-starts in ~30-60s.
- The local resource cache (`backend/.cache`) is ephemeral, so a cold start re-runs
  startup provisioning and creates fresh Tavus personas/guardrails/etc. (harmless -
  only conversations bill). To avoid the churn later, pre-provision once and pass the
  ids via env.

## Recording storage (optional, feature #3)

Tavus copies recordings into **your own** cloud via federated identity. Supported
providers: **Azure Blob** or **AWS S3** (Cloudflare R2 and other S3-compatible stores
are *not* supported - Tavus's S3 mode requires AWS IAM AssumeRole). Recording is
optional; the Report screen's transcript + demeanor analysis work without it.

### Azure Blob (you have Azure)

Tavus federates in via Microsoft Entra (issuer `https://recording-copy.tavus.io`,
subject = your **Tavus Workspace ID** from the Tavus platform profile). Run:

```sh
az login
STORAGE_ACCOUNT=facedrillrec RESOURCE_GROUP=facedrill-rg \
  WORKSPACE_ID=<your-tavus-workspace-id> ./infra/azure/setup-recording.sh
```

It creates the storage account + container, an Entra app with the federated
credential, and the `Storage Blob Data Contributor` role at container scope, then
prints the `.env` lines (`RECORDING_PROVIDER=azure_blob`, storage account, container,
tenant id, client id). Paste them in and restart.

### AWS S3

```sh
BUCKET=your-bucket REGION=us-east-1 ./infra/aws/setup-recording.sh
```

### Verifying a recording

Recording only happens on a **real** interview (a `test_mode` call records nothing),
which spends free-tier minutes. After a short interview, check the container/bucket.
To see the recording URL in the Report screen, set `PUBLIC_BASE_URL` (e.g. ngrok) so
Tavus can POST the `recording_ready` webhook to `/api/webhook`.

## Backend sanity check

```sh
curl http://localhost:8787/api/health
# {
#   "api_key_valid": true,
#   "replica_id": "r90bbd427f71",
#   "personas": { "b1b2": "p...", "f1": "p...", "n400": "p..." }
# }
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Key status, active replica, persona ids |
| GET | `/api/replicas` | List stock replicas to choose a face |
| POST | `/api/liveavatar/embed` | `{category}` -> `{url, conversation_id}` (the frontend's avatar-embed contract; maps category to a persona) |
| POST | `/api/start-session` | `{visa_type, language?, applicant_id?}` -> `{conversation_url, conversation_id}` |
| POST | `/api/end-session` | `{conversation_id}` -> ends the Tavus conversation |
| GET | `/api/report/{conversation_id}` | Demeanor analysis + transcript + recording url |
| POST | `/api/webhook` | Receives Tavus events (transcript, perception, recording-ready) |

## Code quality & tests

```sh
cd backend
pip install -r requirements-dev.txt   # pytest, ruff, mypy
ruff check app/ tests/
mypy app/ tests/
pytest -q                             # smoke tests, no API key/network needed
```

The smoke suite (`backend/tests/`) mocks the Tavus client, so it runs offline. It
covers the `/api/*` routes (including the 422 on a bad `visa_type` and the 502 path
when Tavus errors) and the persona create/reuse/re-sync hashing logic.

The backend follows the repo Python conventions: full type hints, modern union
syntax, Pydantic models, and the `logging` module (no `print`).

## Troubleshooting

- **"TAVUS_API_KEY is not set"** - create `.env` at the project root with a non-empty `TAVUS_API_KEY=...`.
- **Startup fails with a 401** - the Tavus key is invalid or revoked.
- **`start-session` returns 502** - usually out of credits or an invalid `replica_id`; the Tavus error body is logged to the backend console.
- **Avatar never appears ("interviewer isn't responding" after 15s)** - same root causes; check the browser console for `[FD-Daily]` logs and the backend console for the `POST /v2/conversations` response.
- **Idle calls keep billing** - conversations are created with `max_call_duration`, `participant_left_timeout`, and `participant_absent_timeout` set, and the frontend calls `/api/end-session` on End/unload.

## Security note

The Tavus API key is **server-side only** - it lives in `.env` and is read by the
FastAPI backend. The frontend only talks to our own `/api/*` routes.
