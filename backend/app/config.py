"""Runtime configuration loaded from the environment / repo-root .env file."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> parents[2] is the visa-drill repo root, where .env lives.
REPO_ROOT: Path = Path(__file__).resolve().parents[2]


def _load_dotenv_into_environ(path: Path) -> None:
    """Load KEY=VALUE lines from .env into os.environ without overriding real env
    vars. pydantic-settings reads .env into Settings only, so values consumed via
    os.getenv (the waitlist's DB_URL / DB_SERVICE_KEY / ADMIN_TOKEN /
    WAITLIST_FILE) would otherwise be invisible in local dev. Hosts that inject
    real env vars (e.g. the host) still win, because setdefault does not override.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, raw = line.partition("=")
        value = raw.strip()
        if value[:1] in {'"', "'"}:  # quoted: keep contents verbatim (e.g. a "#")
            quote = value[0]
            end = value.find(quote, 1)
            value = value[1:end] if end != -1 else value[1:]
        else:  # unquoted: drop an inline " # comment"
            for sep in (" #", "\t#"):
                if sep in value:
                    value = value.split(sep, 1)[0].rstrip()
        os.environ.setdefault(key.strip(), value)


_load_dotenv_into_environ(REPO_ROOT / ".env")


class Settings(BaseSettings):
    """Application settings sourced from environment variables and `.env`."""

    avatar_api_key: str
    # Stock replica used for every interviewer. Swap via AVATAR_REPLICA_ID; list
    # available stock replicas with `GET /api/replicas`.
    avatar_replica_id: str = "rfb0463909e3"  # "James - Office", a male officer
    # the provider-hosted LLM that drives the persona. tavus-gpt-oss is the lowest-latency default.
    avatar_llm_model: str = "tavus-gpt-oss"
    port: int = 8787
    cors_origin: str = "http://localhost:5173"

    # Visible interview length in seconds (the client countdown). Keep it short to
    # conserve the provider minutes. The the provider hard cap is set a little above this.
    interview_duration_seconds: int = 240

    # Pre-provisioned persona ids (from `scripts/provision.py`). When ALL are set,
    # startup skips creating any the provider resources, so ephemeral hosts (e.g. the host
    # free) do not re-provision and duplicate resources on every cold start.
    persona_b1b2_id: str | None = None
    persona_f1_id: str | None = None
    persona_h1b_id: str | None = None
    persona_j1_id: str | None = None
    persona_n400_id: str | None = None

    def preset_personas(self) -> dict[str, str] | None:
        """Return the persona-id map if every persona id is set via env, else None."""
        ids = {
            "b1b2": self.persona_b1b2_id,
            "f1": self.persona_f1_id,
            "h1b": self.persona_h1b_id,
            "j1": self.persona_j1_id,
            "n400": self.persona_n400_id,
        }
        if all(ids.values()):
            return {visa: value for visa, value in ids.items() if value is not None}
        return None

    # Default spoken language (feature #8); full name, e.g. "english" or "spanish".
    default_language: str = "english"

    # Knowledge base (feature #4): public URL to the USCIS 100 civics questions.
    # Set to empty to disable civics grounding.
    civics_document_url: str = (
        "https://www.uscis.gov/sites/default/files/document/questions-and-answers/100q.pdf"
    )

    # Public base URL of this server (e.g. an a tunnel https URL) so the provider can POST
    # webhooks to <base>/api/webhook. Leave unset to rely on verbose polling.
    public_base_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


def load_settings() -> Settings:
    """Build a Settings instance, raising a clear error if the API key is missing."""
    try:
        return Settings()  # type: ignore[call-arg]  # values come from env / .env
    except ValidationError as err:
        raise RuntimeError(
            "AVATAR_API_KEY is not set. Copy .env.example to .env at the project "
            "root and add your the provider API key."
        ) from err
