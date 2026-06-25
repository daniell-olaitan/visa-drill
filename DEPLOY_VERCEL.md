# Deploy VisaDrill to Vercel

Two Vercel projects from this one repo. Visitors see a single site at
`visadrill.com`; the frontend quietly forwards `/api/*` to the backend at
`api.visadrill.com`. **No code editing needed** - just click through the dashboard.

Do the **backend first**.

---

## Project 1: Backend  (api.visadrill.com)

1. Vercel -> **Add New -> Project** -> import this repo.
2. **Root Directory: `backend`** (click Edit, choose the `backend` folder). This is
   the one setting that matters.
3. **Environment Variables** -> open the box and **paste this whole block**, then
   fill in the 4 `<...>` values (the rest are already correct):

   ```
   AVATAR_API_KEY=<your provider API key>
   PERSONA_B1B2_ID=p7901663e42f
   PERSONA_F1_ID=pcf6c09219cd
   PERSONA_H1B_ID=p576112bb01f
   PERSONA_J1_ID=p4ad8e7a0f63
   PERSONA_N400_ID=p924d7278f82
   AVATAR_REPLICA_ID=rfb0463909e3
   INTERVIEW_DURATION_SECONDS=240
   DB_URL=<your database URL>
   DB_SERVICE_KEY=<your database service key>
   ADMIN_TOKEN=<a long random secret>
   ```

4. **Deploy.**
5. **Domains** -> Settings -> Domains -> add **`api.visadrill.com`**.
6. **Check:** open `https://api.visadrill.com/api/health` - it should return JSON
   with `api_key_valid: true` and five persona ids. If yes, the backend is done.

---

## Project 2: Frontend  (visadrill.com)

1. Vercel -> **Add New -> Project** -> import the **same** repo again.
2. **Root Directory: `client`**. Framework auto-detects as **Vite** - leave the
   defaults.
3. **Deploy.**
4. **Domains** -> add **`visadrill.com`**.

That's it. The frontend is already wired to `api.visadrill.com`, so there is
nothing to edit.

---

## Final check

- `https://visadrill.com` loads the landing page.
- `https://visadrill.com/api/health` returns the persona JSON (proves the link
  between the two projects works).
- `https://visadrill.com/practice` -> start an interview -> the officer connects.

---

## Notes / gotchas

- **The 5 `PERSONA_*_ID` are required** (already filled above). Serverless has a
  read-only disk, so the backend uses preset persona ids instead of creating them.
- **The waitlist needs `DB_URL` + `DB_SERVICE_KEY`** (no persistent disk on
  serverless). Without them, signups are silently dropped.
- **Not using the `api.visadrill.com` subdomain?** Then it's the only edit needed:
  in `client/vercel.json`, swap `https://api.visadrill.com` for the backend's
  `https://<name>.vercel.app` URL, commit, and push.
- Both projects auto-redeploy on every push to `main` (backend rebuilds from
  `backend/`, frontend from `client/`).
- The persona ids above are the current values (from the project `.env`); update
  this block if the provider account ever changes.
