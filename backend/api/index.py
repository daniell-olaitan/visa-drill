"""Vercel entrypoint for the backend project (set the project's Root Directory to
`backend`).

Vercel builds this file as a Python serverless function and routes every request
to it (see `backend/vercel.json`). Importing the app as `app.main` (an absolute
import) keeps the package-relative imports inside `app/` working on Vercel.
"""

from app.main import app  # noqa: F401  (re-exported for Vercel to discover)
