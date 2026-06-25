"""Provision the provider resources once and print the persona ids to pin via env.

Run this locally after setting AVATAR_API_KEY. Paste the
printed PERSONA_*_ID lines into your host's env (e.g. the host dashboard) so deployed
instances reuse these personas instead of re-creating resources on every cold start.

    python backend/scripts/provision.py

Re-run it whenever you change a prompt/objective/guardrail, then update the ids.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import load_settings  # noqa: E402
from app.provisioning import provision  # noqa: E402
from app.avatar import AvatarClient  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("provision")

ENV_KEYS = {
    "b1b2": "PERSONA_B1B2_ID",
    "f1": "PERSONA_F1_ID",
    "h1b": "PERSONA_H1B_ID",
    "j1": "PERSONA_J1_ID",
    "n400": "PERSONA_N400_ID",
}


async def run() -> int:
    settings = load_settings()
    client = AvatarClient(settings.avatar_api_key)
    try:
        personas = await provision(client, settings)
    finally:
        await client.aclose()

    logger.info("\nProvisioned. Set these env vars so startup skips re-provisioning:\n")
    for visa, persona_id in personas.items():
        logger.info("%s=%s", ENV_KEYS[visa], persona_id)
    return 0


def main() -> int:
    try:
        return asyncio.run(run())
    except RuntimeError as err:
        logger.error("%s", err)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
