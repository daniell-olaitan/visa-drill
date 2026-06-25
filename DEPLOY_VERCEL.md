# Deploy VisaDrill to Vercel

VisaDrill is a Vite/React frontend plus a FastAPI backend. On Vercel these deploy
as **two projects from this one GitHub repo**:

1. **Backend** - the FastAPI app, as a Python serverless function.
2. **Frontend** - the Vite SPA, served on `visadrill.com`. It proxies `/api/*` to
   the backend, so the browser only ever talks to `visadrill.com` (no CORS, and
   the frontend code is unchanged).

Do the **backend first** (the frontend needs its URL).

---

## Project 1: Backend

1. Vercel -> **Add New -> Project** -> import this GitHub repo.
2. **Root Directory: `backend`** (click Edit and select the `backend` folder). This
   is the single most important setting.
3. Framework Preset: leave as **Other** (the included `backend/vercel.json` drives
   the build). Do not set a build/output command.
4. **Environment Variables** (Production) - add all of these:

   | Name | Value | Required? |
   |---|---|---|
   | `AVATAR_API_KEY` | your provider API key | **Yes** |
   | `PERSONA_B1B2_ID` | the pinned id | **Yes** |
   | `PERSONA_F1_ID` | the pinned id | **Yes** |
   | `PERSONA_H1B_ID` | the pinned id | **Yes** |
   | `PERSONA_J1_ID` | the pinned id | **Yes** |
   | `PERSONA_N400_ID` | the pinned id | **Yes** |
   | `AVATAR_REPLICA_ID` | `rfb0463909e3` | recommended |
   | `INTERVIEW_DURATION_SECONDS` | e.g. `240` | optional |
   | `DB_URL` | your database URL | for the waitlist |
   | `DB_SERVICE_KEY` | your database service key | for the waitlist |
   | `ADMIN_TOKEN` | a long random secret | to view signups |

   > The five `PERSONA_*_ID` are **mandatory**. Serverless has a read-only disk, so
   > the backend cannot provision personas at startup; it must use preset ids.
   > Likewise the waitlist needs `DB_URL` + `DB_SERVICE_KEY` (no persistent disk).

5. **Deploy.** When it finishes, copy the project's URL, e.g.
   `https://visadrill-backend.vercel.app`.
6. **Verify:** open `https://<backend-url>/api/health` - it must return JSON with
   `api_key_valid: true` and five persona ids. If it does, the backend is good.

---

## Project 2: Frontend

1. **First**, edit `client/vercel.json` in the repo: replace
   `REPLACE-WITH-BACKEND-URL` with the backend URL from step 5 above (host only, no
   trailing slash), then commit and push. Example:

   ```json
   { "source": "/api/:path*", "destination": "https://visadrill-backend.vercel.app/api/:path*" }
   ```

2. Vercel -> **Add New -> Project** -> import the **same** repo again.
3. **Root Directory: `client`**.
4. Framework Preset: **Vite** (auto-detected). Build `npm run build`, output `dist`
   - the defaults; leave them.
5. **Deploy.**
6. **Domains:** project -> Settings -> Domains -> add **`visadrill.com`**.

---

## Verify the whole thing

- `https://visadrill.com` - the landing page loads.
- `https://visadrill.com/api/health` - returns the same JSON as the backend (this
  proves the `/api` proxy works).
- `https://visadrill.com/practice` -> start an interview -> the officer connects
  (the live call is browser-to-provider over WebRTC; the backend just creates and
  reads the session).

## Notes

- **Auto-deploys:** both projects redeploy on every push to `main`. The backend
  rebuilds only from `backend/`, the frontend only from `client/`.
- **Webhooks are not needed** - the report reads the transcript directly from the
  provider, so nothing depends on a persistent server.
- **Python version** is 3.12 (Vercel default), which the backend supports.
