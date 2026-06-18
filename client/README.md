# FaceDrill

Practice your US visa interview with a face that feels real, so the real one
feels familiar.

The core experience is a simulated consular interview: about ten real
questions following the arc of an actual interview (purpose, plans, finances,
ties to home, travel history, credibility checks), answered out loud, followed
by an honest per-answer debrief — what landed, what to tighten, and what the
officer was actually listening for.

## Tech stack

- **Frontend**: Vite, TypeScript, React, Tailwind CSS, shadcn-ui
- **Typography**: Fraunces (display) + Inter (UI), self-hosted via Fontsource
- **Backend (optional)**: Supabase — waitlist with queue position + referrals
- **Hyperreal avatar (optional)**: [LiveAvatar](https://docs.liveavatar.com/) embed via Supabase Edge Function

## Runs with zero configuration

The app is fully explorable without any API keys:

- The **interview simulator** runs entirely in the browser. The officer speaks
  through the Web Speech API, voice answers use SpeechRecognition where the
  browser supports it (typing always works), and the debrief is computed
  locally. Transcripts never leave the device.
- The **waitlist form** degrades gracefully: without Supabase it confirms
  signups locally and skips the queue-position number rather than inventing one.

Configured integrations layer on top:

| Capability | Requires |
| --- | --- |
| Waitlist storage + queue position + referral boost | Supabase env vars + migrations |
| Hyperreal talking avatar | `LIVEAVATAR_API_KEY` in `.env` (dev) or edge function (prod) |

When the avatar isn't configured (or fails), the interview falls back to the
built-in simulator and shows operators a dismissible setup notice in-session.

## Local development

Requires Node.js & npm.

```sh
git clone <YOUR_GIT_URL>
cd facedrill
npm install
npm run dev
```

The dev server runs on port 8080. (In containers without IPv6, run
`npx vite --host 127.0.0.1 --port 8080`.)

## Environment variables

Create a `.env` file at the project root (optional — see above):

```
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

## Waitlist setup (Supabase)

Run the migrations in `supabase/migrations/`. The latest adds:

- `position`, `referral_code`, and `referred_by` columns on `waitlist`
- a `join_waitlist(p_email, p_referred_by)` RPC that returns the signup's
  queue position and personal referral code

Each friend who joins through a referral link (`/?ref=CODE`) moves the
referrer up 25 spots. RLS allows inserts only; the table is not readable via
the API.

## LiveAvatar setup

The interview loads a real-time [LiveAvatar](https://docs.liveavatar.com/)
embed of a consular officer. The embed URL is created server-side so the API
key never reaches the browser. The officer persona (context) is created
automatically the first time it's needed — you only need an API key.

### Local development

1. Sign up at [app.liveavatar.com](https://app.liveavatar.com) and copy your
   API key.
2. Add it to `.env` (see `.env.example`):

```sh
LIVEAVATAR_API_KEY="your-api-key"
# Optional — defaults to the "Dexter Lawyer" present avatar:
LIVEAVATAR_AVATAR_ID="0930fd59-c8ad-434d-ad53-b391a1768720"
# "true" uses the free sandbox avatar (~1 min sessions, no credits):
LIVEAVATAR_IS_SANDBOX="false"
```

3. Restart `npm run dev`. The Vite dev proxy (`vite/liveavatarProxy.ts`) adds
   the `X-API-KEY` header and calls LiveAvatar's
   [embed API](https://docs.liveavatar.com/api-reference/embeddings/create-embed-v2.md)
   from the node process, returning just the iframe URL to the client.

> The proxy makes outbound calls to `api.liveavatar.com`. In a sandboxed
> environment (e.g. Claude Code on the web), add that host to the network
> egress allowlist or the avatar will fall back to the simulator.

### Production

Static hosting has no node server, so deploy the included Supabase Edge
Function (`supabase/functions/liveavatar-embed`) — same logic, same auto-context
— and point the client at it:

```sh
supabase secrets set LIVEAVATAR_API_KEY=your-api-key
# Optional: LIVEAVATAR_AVATAR_ID, LIVEAVATAR_CONTEXT_ID, LIVEAVATAR_IS_SANDBOX
supabase functions deploy liveavatar-embed
```

Then set `VITE_LIVEAVATAR_EMBED_URL` to the deployed function URL.

If no key is configured or the embed call fails, the interview falls back to
the built-in simulator. To force the simulator, open `/interview?mode=sim`.

The `liveavatar-debug` and `liveavatar-integrate` agent skills (in
`.claude/skills/`) help troubleshoot and extend the integration.

## Deployment

The repo includes a `Dockerfile` and `nginx.conf` for serving the built static
site. Deploy to GCP Cloud Run with:

```sh
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/facedrill
gcloud run deploy facedrill \
  --image gcr.io/YOUR_PROJECT_ID/facedrill \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```
