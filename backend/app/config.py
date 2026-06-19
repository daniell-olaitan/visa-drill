"""Runtime configuration loaded from the environment / repo-root .env file."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> parents[2] is the face-drill repo root, where .env lives.
REPO_ROOT: Path = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings sourced from environment variables and `.env`."""

    tavus_api_key: str
    # Stock replica used for every interviewer. Swap via TAVUS_REPLICA_ID; list
    # available stock replicas with `GET /api/replicas`.
    tavus_replica_id: str = "r90bbd427f71"
    # Tavus-hosted LLM that drives the persona. tavus-gpt-oss is the lowest-latency default.
    tavus_llm_model: str = "tavus-gpt-oss"
    port: int = 8787
    cors_origin: str = "http://localhost:5173"

    # Visible interview length in seconds (the client countdown). Keep it short to
    # conserve Tavus minutes. The Tavus hard cap is set a little above this.
    interview_duration_seconds: int = 240

    # Pre-provisioned persona ids (from `scripts/provision.py`). When all three are
    # set, startup skips creating any Tavus resources, so ephemeral hosts (e.g. Render
    # free) do not re-provision and duplicate resources on every cold start.
    persona_b1b2_id: str | None = None
    persona_f1_id: str | None = None
    persona_n400_id: str | None = None

    def preset_personas(self) -> dict[str, str] | None:
        """Return the persona-id map if all three are set via env, else None."""
        ids = {
            "b1b2": self.persona_b1b2_id,
            "f1": self.persona_f1_id,
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

    # Public base URL of this server (e.g. an ngrok https URL) so Tavus can POST
    # webhooks to <base>/api/webhook. Leave unset to rely on verbose polling.
    public_base_url: str | None = None

    # Session recording (feature #3). Tavus copies the recording into your own
    # cloud via federated identity. Supported providers: "s3" or "azure_blob".
    enable_recording: bool = False
    recording_provider: str = "s3"
    recording_key_template: str | None = None
    # AWS S3 (provider="s3"): Tavus assumes an IAM role to write to the bucket.
    recording_bucket: str | None = None
    recording_region: str | None = None
    recording_role_arn: str | None = None
    # Azure Blob (provider="azure_blob"): Tavus uses Entra workload-identity federation.
    recording_azure_storage_account: str | None = None
    recording_azure_container: str | None = None
    recording_azure_tenant_id: str | None = None
    recording_azure_client_id: str | None = None

    def recording_storage(self, *, force: bool = False) -> dict[str, Any] | None:
        """Build the `recording_storage` payload for the configured provider, or None.

        Returns None when recording is disabled or the chosen provider is missing
        required fields, so the caller can omit storage rather than send a bad config.
        `force=True` ignores the enable flag (used by the verify script to probe a
        configured-but-not-yet-enabled provider).
        """
        if not force and not self.enable_recording:
            return None

        config: dict[str, Any] | None = None
        if self.recording_provider == "s3":
            if self.recording_bucket:
                config = {
                    "provider": "s3",
                    "bucket_name": self.recording_bucket,
                    "bucket_region": self.recording_region,
                    "assume_role_arn": self.recording_role_arn,
                }
        elif self.recording_provider == "azure_blob":
            if self.recording_azure_storage_account and self.recording_azure_container:
                config = {
                    "provider": "azure_blob",
                    "storage_account": self.recording_azure_storage_account,
                    "container": self.recording_azure_container,
                    "tenant_id": self.recording_azure_tenant_id,
                    "client_id": self.recording_azure_client_id,
                }

        if config is not None and self.recording_key_template:
            config["key_template"] = self.recording_key_template
        return config

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
            "TAVUS_API_KEY is not set. Copy .env.example to .env at the project "
            "root and add your Tavus API key."
        ) from err
