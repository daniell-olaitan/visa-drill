"""Request and response schemas for the FaceDrill API."""

from __future__ import annotations

from pydantic import BaseModel

from .personas import VisaType


class StartSessionRequest(BaseModel):
    """Body for POST /api/start-session."""

    visa_type: VisaType
    # Full language name (feature #8), e.g. "english"; falls back to the server default.
    language: str | None = None
    # Stable per-user key for cross-session memory (feature #7); omitted = stateless.
    applicant_id: str | None = None
    # Per-session context appended to the persona (e.g. the specific visa category).
    conversational_context: str | None = None


class StartSessionResponse(BaseModel):
    """Tavus conversation details the frontend needs to join the Daily room."""

    conversation_url: str
    conversation_id: str


class EmbedRequest(BaseModel):
    """Body for POST /api/liveavatar/embed (the frontend's avatar-embed contract)."""

    category: str
    # Optional applicant-provided details (the "DS-160-lite" pre-form) appended to
    # the officer's context so it can reference and probe the applicant's situation.
    applicant_context: str | None = None


class EmbedResponse(BaseModel):
    """An embeddable conversation URL, matching the frontend's expected shape."""

    url: str
    conversation_id: str
    # Visible interview length for the client countdown timer.
    max_seconds: int


class EndSessionRequest(BaseModel):
    """Body for POST /api/end-session."""

    conversation_id: str


class HealthResponse(BaseModel):
    """Startup/health summary."""

    api_key_valid: bool
    replica_id: str
    personas: dict[str, str]


class StockReplica(BaseModel):
    """A single stock replica entry for the picker endpoint."""

    replica_id: str
    replica_name: str | None = None


class TranscriptTurn(BaseModel):
    """One spoken turn in the interview transcript."""

    role: str
    content: str


class ReportResponse(BaseModel):
    """Post-interview report assembled from Tavus events (features #1, #2, #3)."""

    conversation_id: str
    status: str
    transcript: list[TranscriptTurn]
    perception_analysis: str | None = None
    recording_url: str | None = None
    ready: bool
