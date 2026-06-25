"""VisaDrill FastAPI backend: turns visa-interview personas into live the conversational video AI calls.

Provisions the full the provider feature set at startup (personas with perception, STT,
flow, and pronunciation layers; objectives; guardrails; a civics knowledge-base
document) with graceful degradation, then exposes session, webhook, and report
endpoints.
"""

from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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
    WaitlistRequest,
)
from .personas import SPECS, VISA_TYPES, PersonaMap, VisaType
from .provisioning import provision
from .avatar import AvatarApiError, AvatarClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("visadrill")

# Conversation runtime limits. Idle the provider sessions keep billing GPU time, so both
# timeouts are always set. The hard call cap is the
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
    client = AvatarClient(settings.avatar_api_key)

    logger.info("verifying the provider API key...")
    verify = await client.request("GET", "/personas", params={"limit": 1})
    if verify.status_code == 401:
        await client.aclose()
        raise RuntimeError("the provider API key is invalid (401 from GET /v2/personas).")
    if not verify.is_success:
        await client.aclose()
        raise RuntimeError(f"the provider key check failed: {verify.status_code} {verify.text[:200]}")
    logger.info("API key verified.")

    preset = settings.preset_personas()
    if preset is not None:
        # Pre-provisioned ids: no creation at startup, so ephemeral hosts do not
        # duplicate resources on cold start.
        personas: PersonaMap = {visa: preset[visa] for visa in VISA_TYPES}
        logger.info("using preset persona ids from env: %s", personas)
    else:
        logger.info("provisioning resources (replica=%s)...", settings.avatar_replica_id)
        try:
            personas = await provision(client, settings)
        except AvatarApiError:
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


def _client(app: FastAPI) -> AvatarClient:
    return app.state.client


def _personas(app: FastAPI) -> PersonaMap:
    return app.state.personas


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings: Settings = app.state.settings
    return HealthResponse(
        api_key_valid=True,
        replica_id=settings.avatar_replica_id,
        personas={str(visa): pid for visa, pid in _personas(app).items()},
    )


@app.get("/api/replicas", response_model=list[StockReplica])
async def list_replicas() -> list[StockReplica]:
    """List the provider stock replicas so the interviewer face can be swapped via AVATAR_REPLICA_ID."""
    try:
        data = await _client(app).request_json(
            "GET", "/replicas", params={"replica_type": "system", "limit": 100}
        )
    except AvatarApiError as err:
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

    payload: dict[str, Any] = {
        "persona_id": persona_id,
        "replica_id": settings.avatar_replica_id,
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
    # Webhook delivery (feature #1) when a public URL is known. Set PUBLIC_BASE_URL
    # to your deployed origin so events can POST to <base>/api/webhook.
    if settings.public_base_url:
        payload["callback_url"] = f"{settings.public_base_url.rstrip('/')}/api/webhook"

    try:
        conversation = await _client(app).request_json("POST", "/conversations", json=payload)
    except AvatarApiError as err:
        logger.error("start-session failed: %s", err)
        raise HTTPException(status_code=502, detail=str(err)) from err

    url = conversation.get("conversation_url")
    conversation_id = conversation.get("conversation_id")
    if not isinstance(url, str) or not isinstance(conversation_id, str):
        raise HTTPException(status_code=502, detail=f"unexpected the provider response: {conversation}")

    logger.info("start-session: visa=%s conversation_id=%s", body.visa_type, conversation_id)
    return StartSessionResponse(conversation_url=url, conversation_id=conversation_id)


@app.post("/api/liveavatar/embed", response_model=EmbedResponse)
async def embed(body: EmbedRequest) -> EmbedResponse:
    """Avatar-embed endpoint the frontend calls; returns a provider conversation URL.

    Mirrors the frontend's existing LiveAvatar embed contract ({category} -> {url})
    so the interview UI works unchanged, but the URL is a provider room.
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
    )


@app.post("/api/end-session")
async def end_session(body: EndSessionRequest) -> dict[str, bool]:
    """End a provider conversation so its room shuts down and billing stops promptly."""
    try:
        await _client(app).request_json("POST", f"/conversations/{body.conversation_id}/end")
    except AvatarApiError as err:
        # Ending an already-ended conversation is not worth surfacing to the user.
        logger.warning("end-session non-fatal error: %s", err)
    return {"ended": True}


async def _store_waitlist_email(email: str) -> bool:
    """Persist a waitlist email.

    Prefers a database `waitlist` table when DB_URL + DB_SERVICE_KEY
    are set (durable, dedupes on the unique email column), and falls back to a
    local JSONL file otherwise (handy for dev; ephemeral on hosts without a
    persistent disk). Returns True if the email was stored somewhere.
    """
    db_url = os.getenv("DB_URL")
    service_key = os.getenv("DB_SERVICE_KEY")
    if db_url and service_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                res = await http.post(
                    f"{db_url.rstrip('/')}/rest/v1/waitlist",
                    headers={
                        "apikey": service_key,
                        "Authorization": f"Bearer {service_key}",
                        "Content-Type": "application/json",
                    },
                    json={"email": email},
                )
            # 2xx = inserted; 409 = the email is already on the list. Both are fine.
            if res.is_success or res.status_code == 409:
                return True
            logger.warning("waitlist DB insert failed: %s %s", res.status_code, res.text[:200])
        except httpx.HTTPError as err:
            logger.warning("waitlist DB insert error: %s", err)

    record = {"email": email, "joined_at": datetime.now(timezone.utc).isoformat()}
    try:
        path = Path(os.getenv("WAITLIST_FILE", "waitlist.jsonl"))
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
        return True
    except OSError as err:
        logger.warning("waitlist file append failed: %s", err)
        return False


@app.post("/api/waitlist")
async def join_waitlist(body: WaitlistRequest) -> JSONResponse:
    """Capture a waitlist signup from the landing form.

    Stores to the database when configured, else a local file. Returns the
    {data, error} shape the client form expects.
    """
    email = body.email.strip().lower()
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    if "@" not in email or "." not in domain:
        return JSONResponse(
            status_code=400,
            content={"data": None, "error": {"code": "INVALID_EMAIL", "message": "Enter a valid email address."}},
        )

    if not await _store_waitlist_email(email):
        return JSONResponse(
            status_code=500,
            content={"data": None, "error": {"code": "STORE_FAILED", "message": "Could not save your signup. Please try again."}},
        )
    logger.info("waitlist signup: %s", email)
    return JSONResponse(content={"data": {"email": email}, "error": None})


async def _list_waitlist_emails() -> list[dict[str, Any]]:
    """Read all waitlist signups (newest first) from the database, else the local file."""
    db_url = os.getenv("DB_URL")
    service_key = os.getenv("DB_SERVICE_KEY")
    if db_url and service_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                res = await http.get(
                    f"{db_url.rstrip('/')}/rest/v1/waitlist",
                    params={"select": "email,joined_at", "order": "joined_at.desc"},
                    headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
                )
            if res.is_success:
                return res.json()
            logger.warning("waitlist DB list failed: %s %s", res.status_code, res.text[:200])
        except httpx.HTTPError as err:
            logger.warning("waitlist DB list error: %s", err)

    entries: list[dict[str, Any]] = []
    try:
        path = Path(os.getenv("WAITLIST_FILE", "waitlist.jsonl"))
        if path.exists():
            for line in reversed(path.read_text(encoding="utf-8").splitlines()):
                if line.strip():
                    entries.append(json.loads(line))
    except (OSError, json.JSONDecodeError) as err:
        logger.warning("waitlist file read failed: %s", err)
    return entries


@app.get("/api/waitlist")
async def list_waitlist(request: Request) -> JSONResponse:
    """Admin-only view of waitlist signups.

    Requires the ADMIN_TOKEN env var, sent as the `X-Admin-Token` header. Returns
    404 when no token is configured, so the endpoint is invisible by default.
    """
    admin_token = os.getenv("ADMIN_TOKEN")
    if not admin_token:
        raise HTTPException(status_code=404, detail="Not found")
    if request.headers.get("x-admin-token") != admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    entries = await _list_waitlist_emails()
    return JSONResponse(content={"data": entries, "count": len(entries), "error": None})


@app.post("/api/webhook")
async def webhook(request: Request) -> dict[str, bool]:
    """Receive the provider webhook events (transcript, perception analysis)."""
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


# Only genuinely spoken turns belong in the transcript. the provider also emits the system
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
) -> tuple[list[TranscriptTurn], str | None]:
    """Extract the transcript and perception analysis from the provider events."""
    transcript: list[TranscriptTurn] = []
    utterances: list[dict[str, Any]] = []
    perception: str | None = None

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
        elif etype.endswith("utterance"):
            speech = props.get("speech") or props.get("text")
            if isinstance(speech, str) and speech:
                utterances.append({"role": props.get("role", ""), "speech": speech})

    return (transcript or _clean_turns(utterances)), perception


@app.get("/api/report/{conversation_id}", response_model=ReportResponse)
async def report(conversation_id: str) -> ReportResponse:
    """Assemble the post-interview report from the verbose conversation and any webhooks."""
    try:
        convo = await _client(app).request_json(
            "GET", f"/conversations/{conversation_id}", params={"verbose": "true"}
        )
    except AvatarApiError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    events = convo.get("events") if isinstance(convo, dict) else None
    events = events if isinstance(events, list) else []
    events = [*events, *app.state.events.get(conversation_id, [])]

    transcript, perception = _parse_events(events)
    return ReportResponse(
        conversation_id=conversation_id,
        status=str(convo.get("status", "unknown")) if isinstance(convo, dict) else "unknown",
        transcript=transcript,
        perception_analysis=perception,
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
