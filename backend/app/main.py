"""VisaDrill FastAPI backend: turns visa-interview personas into live Tavus CVI calls.

Provisions the full Tavus feature set at startup (personas with perception, STT,
flow, and pronunciation layers; objectives; guardrails; a civics knowledge-base
document) with graceful degradation, then exposes session, webhook, and report
endpoints. See TAVUS_GUIDE.md for the underlying API.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_settings
from .models import (
    EmbedRequest,
    EmbedResponse,
    EndSessionRequest,
    HealthResponse,
    ReportResponse,
    StartSessionRequest,
    StartSessionResponse,
    StockReplica,
    TranscriptTurn,
)
from .personas import SPECS, VISA_TYPES, PersonaMap, VisaType
from .provisioning import provision
from .tavus import TavusApiError, TavusClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("visadrill")

# Conversation runtime limits. Idle Tavus sessions keep billing GPU time, so both
# timeouts are always set (see TAVUS_GUIDE.md section 8). The hard call cap is the
# visible interview length plus a small safety buffer.
CALL_DURATION_BUFFER_S = 30
PARTICIPANT_LEFT_TIMEOUT_S = 10
PARTICIPANT_ABSENT_TIMEOUT_S = 60

# The frontend's VisaCategory (b1b2/f1/h1b/j1/any) -> our persona visa_type.
# "b1b2" is the general nonimmigrant consular officer (it adapts to the category
# via conversational_context below); the F-1 student officer stays dedicated.
# The frontend's VisaCategory -> a dedicated officer persona. Each persona's
# prompt carries its own visa-specific scrutiny, so no extra context is needed;
# "any" (general practice) uses the visitor officer.
CATEGORY_TO_VISA: dict[str, VisaType] = {
    "b1b2": "b1b2",
    "f1": "f1",
    "h1b": "h1b",
    "j1": "j1",
    "any": "b1b2",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Verify the API key and resolve the personas (preset env ids or provision)."""
    settings: Settings = load_settings()
    client = TavusClient(settings.tavus_api_key)

    logger.info("verifying Tavus API key...")
    verify = await client.request("GET", "/personas", params={"limit": 1})
    if verify.status_code == 401:
        await client.aclose()
        raise RuntimeError("Tavus API key is invalid (401 from GET /v2/personas).")
    if not verify.is_success:
        await client.aclose()
        raise RuntimeError(f"Tavus key check failed: {verify.status_code} {verify.text[:200]}")
    logger.info("API key verified.")

    preset = settings.preset_personas()
    if preset is not None:
        # Pre-provisioned ids: no creation at startup, so ephemeral hosts do not
        # duplicate resources on cold start.
        personas: PersonaMap = {visa: preset[visa] for visa in VISA_TYPES}
        logger.info("using preset persona ids from env: %s", personas)
    else:
        logger.info("provisioning resources (replica=%s)...", settings.tavus_replica_id)
        try:
            personas = await provision(client, settings)
        except TavusApiError:
            await client.aclose()
            raise
        logger.info("personas ready: %s", personas)

    app.state.settings = settings
    app.state.client = client
    app.state.personas = personas
    app.state.events = {}
    try:
        yield
    finally:
        await client.aclose()


app = FastAPI(title="VisaDrill", lifespan=lifespan)


def _client(app: FastAPI) -> TavusClient:
    return app.state.client


def _personas(app: FastAPI) -> PersonaMap:
    return app.state.personas


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings: Settings = app.state.settings
    return HealthResponse(
        api_key_valid=True,
        replica_id=settings.tavus_replica_id,
        personas={str(visa): pid for visa, pid in _personas(app).items()},
    )


@app.get("/api/replicas", response_model=list[StockReplica])
async def list_replicas() -> list[StockReplica]:
    """List Tavus stock replicas so the interviewer face can be swapped via TAVUS_REPLICA_ID."""
    try:
        data = await _client(app).request_json(
            "GET", "/replicas", params={"replica_type": "system", "limit": 100}
        )
    except TavusApiError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err
    items = data.get("data", []) if isinstance(data, dict) else []
    return [
        StockReplica(replica_id=item.get("replica_id", ""), replica_name=item.get("replica_name"))
        for item in items
        if item.get("replica_id")
    ]


@app.post("/api/start-session", response_model=StartSessionResponse)
async def start_session(body: StartSessionRequest) -> StartSessionResponse:
    settings: Settings = app.state.settings
    persona_id = _personas(app)[body.visa_type]

    properties: dict[str, Any] = {
        "max_call_duration": settings.interview_duration_seconds + CALL_DURATION_BUFFER_S,
        "participant_left_timeout": PARTICIPANT_LEFT_TIMEOUT_S,
        "participant_absent_timeout": PARTICIPANT_ABSENT_TIMEOUT_S,
        "enable_closed_captions": True,
        "language": body.language or settings.default_language,
    }
    if settings.enable_recording:
        properties["enable_recording"] = True
        storage = settings.recording_storage()
        if storage is not None:
            properties["recording_storage"] = storage

    payload: dict[str, Any] = {
        "persona_id": persona_id,
        "replica_id": settings.tavus_replica_id,
        "conversation_name": f"VisaDrill {body.visa_type}",
        "custom_greeting": SPECS[body.visa_type].greeting,
        "properties": properties,
    }
    # Per-session context (e.g. the specific visa category) layered on the persona.
    if body.conversational_context:
        payload["conversational_context"] = body.conversational_context
    # Cross-session memory (feature #7): a stable, user-specific store key.
    if body.applicant_id:
        payload["memory_stores"] = [f"{body.applicant_id}-{body.visa_type}"]
    # Webhook delivery (features #1/#3) when a public URL is known. Render injects
    # RENDER_EXTERNAL_URL automatically, so deployed instances need no extra config.
    webhook_base = settings.public_base_url or os.getenv("RENDER_EXTERNAL_URL")
    if webhook_base:
        payload["callback_url"] = f"{webhook_base.rstrip('/')}/api/webhook"

    try:
        conversation = await _client(app).request_json("POST", "/conversations", json=payload)
    except TavusApiError as err:
        logger.error("start-session failed: %s", err)
        raise HTTPException(status_code=502, detail=str(err)) from err

    url = conversation.get("conversation_url")
    conversation_id = conversation.get("conversation_id")
    if not isinstance(url, str) or not isinstance(conversation_id, str):
        raise HTTPException(status_code=502, detail=f"unexpected Tavus response: {conversation}")

    logger.info("start-session: visa=%s conversation_id=%s", body.visa_type, conversation_id)
    return StartSessionResponse(conversation_url=url, conversation_id=conversation_id)


@app.post("/api/liveavatar/embed", response_model=EmbedResponse)
async def embed(body: EmbedRequest) -> EmbedResponse:
    """Avatar-embed endpoint the frontend calls; returns a Tavus conversation URL.

    Mirrors the frontend's existing LiveAvatar embed contract ({category} -> {url})
    so the interview UI works unchanged, but the URL is a Tavus Daily room.
    """
    settings: Settings = app.state.settings
    category = body.category.lower()
    visa_type: VisaType = CATEGORY_TO_VISA.get(category) or "b1b2"
    session = await start_session(
        StartSessionRequest(
            visa_type=visa_type, conversational_context=body.applicant_context
        )
    )
    return EmbedResponse(
        url=session.conversation_url,
        conversation_id=session.conversation_id,
        max_seconds=settings.interview_duration_seconds,
        recording=settings.enable_recording,
    )


@app.post("/api/end-session")
async def end_session(body: EndSessionRequest) -> dict[str, bool]:
    """End a Tavus conversation so its room shuts down and billing stops promptly."""
    try:
        await _client(app).request_json("POST", f"/conversations/{body.conversation_id}/end")
    except TavusApiError as err:
        # Ending an already-ended conversation is not worth surfacing to the user.
        logger.warning("end-session non-fatal error: %s", err)
    return {"ended": True}


@app.post("/api/webhook")
async def webhook(request: Request) -> dict[str, bool]:
    """Receive Tavus webhook events (transcript, perception analysis, recording-ready)."""
    event = await request.json()
    conversation_id = event.get("conversation_id") if isinstance(event, dict) else None
    if isinstance(conversation_id, str):
        app.state.events.setdefault(conversation_id, []).append(event)
    logger.info(
        "webhook: %s for %s",
        event.get("event_type") if isinstance(event, dict) else "?",
        conversation_id,
    )
    return {"received": True}


# Only genuinely spoken turns belong in the transcript. Tavus also emits the system
# prompt and internal context (timezone, SSML/TTS directions) as non-spoken roles.
_SPOKEN_ROLES = {"user", "assistant", "replica", "agent"}
# Spoken utterances are short; anything this long is a system prompt / context blob.
_MAX_TURN_CHARS = 2000


def _clean_turns(raw: list[Any]) -> list[TranscriptTurn]:
    """Keep only spoken user/officer turns, dropping system/context and duplicates."""
    out: list[TranscriptTurn] = []
    for turn in raw:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role", "")).lower()
        if role not in _SPOKEN_ROLES:
            continue
        content = str(turn.get("content") or turn.get("speech") or "").strip()
        if not content or len(content) > _MAX_TURN_CHARS:
            continue
        normalized = "user" if role == "user" else "assistant"
        if out and out[-1].role == normalized and out[-1].content == content:
            continue  # collapse exact consecutive repeats
        out.append(TranscriptTurn(role=normalized, content=content))
    return out


def _parse_events(
    events: list[Any],
) -> tuple[list[TranscriptTurn], str | None, str | None]:
    """Extract transcript, perception analysis, and recording url from Tavus events."""
    transcript: list[TranscriptTurn] = []
    utterances: list[dict[str, Any]] = []
    perception: str | None = None
    recording: str | None = None

    for ev in events:
        if not isinstance(ev, dict):
            continue
        etype = str(ev.get("event_type") or ev.get("type") or "")
        props = ev.get("properties")
        props = props if isinstance(props, dict) else {}

        if etype.endswith("transcription_ready"):
            turns = props.get("transcript")
            if isinstance(turns, list):
                cleaned = _clean_turns(turns)
                if cleaned:
                    transcript = cleaned  # last/most-complete transcript wins (no doubling)
        elif etype.endswith("perception_analysis"):
            analysis = props.get("analysis")
            if isinstance(analysis, str):
                perception = analysis
        elif etype.endswith("recording_ready"):
            uri = props.get("storage_uri") or props.get("s3_key") or props.get("url")
            if uri is not None:
                recording = str(uri)
        elif etype.endswith("utterance"):
            speech = props.get("speech") or props.get("text")
            if isinstance(speech, str) and speech:
                utterances.append({"role": props.get("role", ""), "speech": speech})

    return (transcript or _clean_turns(utterances)), perception, recording


@app.get("/api/report/{conversation_id}", response_model=ReportResponse)
async def report(conversation_id: str) -> ReportResponse:
    """Assemble the post-interview report from the verbose conversation and any webhooks."""
    try:
        convo = await _client(app).request_json(
            "GET", f"/conversations/{conversation_id}", params={"verbose": "true"}
        )
    except TavusApiError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    events = convo.get("events") if isinstance(convo, dict) else None
    events = events if isinstance(events, list) else []
    events = [*events, *app.state.events.get(conversation_id, [])]

    transcript, perception, recording = _parse_events(events)
    return ReportResponse(
        conversation_id=conversation_id,
        status=str(convo.get("status", "unknown")) if isinstance(convo, dict) else "unknown",
        transcript=transcript,
        perception_analysis=perception,
        recording_url=recording,
        ready=bool(transcript) or perception is not None,
    )


# Configured at import time so it does not depend on the API key being present
# (the key is validated at startup, inside the lifespan handler).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the built Vite SPA when present (single-service deploy). The Dockerfile
# copies client/dist here. Absent in local dev, where Vite serves the frontend.
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
if STATIC_DIR.is_dir():
    assets = STATIC_DIR / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        # API routes are matched first; unknown /api paths should 404, not serve HTML.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
