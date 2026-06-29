# VisaDrill

Practice high-stakes U.S. visa interviews with a hyperreal AI consular officer, then get an honest, scored debrief - so the real interview feels like your second time.

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

> A Vite/React single-page app with a **Supabase** backend (Edge Functions + Postgres). The live officer is a real-time talking avatar streamed over WebRTC with a custom in-call UI. If the avatar can't start, a zero-config **browser simulator** takes over.

## How an interview works

1. **Practice** -> pick a visa category.
2. A brief **"I'm ready" briefing** screen (no form to fill in). The tap also unlocks iOS audio so the officer's voice can autoplay.
3. **Live interview** (`/interview`, full-screen): the AI officer over WebRTC, with the officer video filling the card, your self-view as a PiP, **mic/camera** controls, **live captions (CC toggle)**, and a **countdown that auto-ends**.
4. **Debrief** (`/debrief`): a scored report (below).

The officer opens by asking the purpose of the trip; it does not ask for the applicant's name.

## Per-category officers

Each category maps 1:1 to a dedicated AI persona with its own grounded prompt and objectives:

| Category | Officer focus |
|---|---|
| Visitor (B1/B2) | Purpose, itinerary, funding, **ties/return intent** (INA 214(b)) |
| Student (F-1) | School/program, funding, why-the-U.S., return intent |
| Work (H-1B) | Employer, specialty occupation, degree, salary - **dual-intent** (no ties/return pressure) |
| Exchange (J-1) | Program + sponsor (DS-2019), funding, ties, **212(e)** |
| `any` | Uses the Visitor officer |
| N-400 (citizenship) | Exists in the backend; not surfaced in the UI |

## Scored debrief

For a live interview, `/debrief` fetches the `report` function and shows:

- a **verdict** + **approval-readiness score (0-100)**, with **progress vs. your last attempt**,
- **per-area scores** (purpose, ties, finances, and so on),
- **per-answer notes** (what landed / what to tighten), computed by a free local heuristic on the transcript; **unanswered questions count as zero**, so going silent tanks the score.

Scoring is local and free (no extra LLM call), and the browser simulator keeps its own local heuristic debrief.

## Architecture

<img src="https://raw.githubusercontent.com/daniell-olaitan/visa-drill/main/docs/architecture.svg" alt="VisaDrill architecture: the browser SPA calls Supabase Edge Functions and joins the conversational-video AI directly over WebRTC; the functions store waitlist signups in Postgres." width="100%">

- **Frontend** - a Vite/React SPA, hosted on Lovable (static/CDN).
- **Backend** - three **Supabase Edge Functions** (`supabase/functions/`):

  | Function | Does |
  |---|---|
  | `start-session` | creates a provider conversation and returns its room URL |
  | `report` | fetches the verbose conversation and parses the transcript |
  | `waitlist` | stores a signup in the `waitlist` table |

- **Data** - Supabase Postgres (the `waitlist` table).

The live call is **browser to provider over WebRTC** (the API key never reaches the browser); the functions are only hit to start a session and to fetch the debrief. The officer personas are pre-provisioned, and their ids live in the function secrets (see [DEPLOY_LOVABLE.md](DEPLOY_LOVABLE.md)).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui, with Framer Motion for the landing |
| Backend | Supabase Edge Functions (TypeScript / Deno) |
| Data | Supabase Postgres |
| Realtime | WebRTC (the officer's audio + video) |

The landing also ships a light/dark theme toggle and an email waitlist form (see [Waitlist](#waitlist)).

## Project structure

```
src/                  # the React app (pages, components, lib)
supabase/
  config.toml         # links the functions to the Supabase project
  functions/          # the backend (Deno)
    start-session/
    report/
    waitlist/
    _shared/cors.ts
  migrations/         # SQL schema history
docs/                 # the architecture diagram
```

## Local development

1. **Configure env.** Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (both public, browser-safe).
2. **Install + run:**

   ```sh
   npm install
   npm run dev          # http://localhost:8080
   ```

The app calls the **deployed** Supabase functions. To run the functions locally instead, use `supabase functions serve` and point `VITE_SUPABASE_URL` at the local URL.

## Deploy

See **[DEPLOY_LOVABLE.md](DEPLOY_LOVABLE.md)**: set the function secrets, deploy the three functions, set the two `VITE_*` vars in Lovable, and attach your domain.

## Waitlist

The landing form posts `{email}` to the `waitlist` function, which inserts into a `waitlist` table (dedupes on a unique email). Create it once in the Supabase SQL editor:

```sql
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  joined_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;  -- the service role bypasses RLS
```

## Provisioning the officers

Creating the personas (prompts, objectives, guardrails) is a one-time job done with the original Python backend, now archived next to this repo at `../visadrill-fastapi-backend/`. The persona ids are already created and pinned in the function secrets, so you only need to re-run it after changing a persona prompt or switching provider accounts.

## Code quality

```sh
npm run lint                       # frontend
deno check supabase/functions/*/index.ts   # edge functions
```
