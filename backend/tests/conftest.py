"""Shared fixtures: a fake Tavus client so tests need no API key or network."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.tavus import TavusApiError


class FakeResponse:
    """Minimal stand-in for httpx.Response used by `TavusClient.request`."""

    def __init__(self, status_code: int, text: str = "") -> None:
        self.status_code = status_code
        self.text = text


class FakeTavusClient:
    """Records calls and returns canned payloads instead of hitting Tavus."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any] | None]] = []
        self.existing: set[str] = set()
        self.fail_paths: set[str] = set()
        self.create_count = 0

    async def aclose(self) -> None:
        return None

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> FakeResponse:
        self.calls.append((method, path, json))
        if path.startswith("/personas/"):
            persona_id = path.removeprefix("/personas/")
            return FakeResponse(200 if persona_id in self.existing else 404)
        return FakeResponse(200)

    async def request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.calls.append((method, path, json))
        if path in self.fail_paths:
            raise TavusApiError(502, path, "simulated failure")
        if path == "/conversations" and method == "POST":
            return {
                "conversation_url": "https://tavus.daily.co/c123",
                "conversation_id": "c123",
                "status": "active",
            }
        if path.endswith("/end"):
            return {}
        if method == "GET" and path.startswith("/conversations/"):
            return {
                "status": "ended",
                "events": [
                    {
                        "event_type": "application.transcription_ready",
                        "properties": {
                            "transcript": [
                                {"role": "replica", "content": "Please state your name."},
                                {"role": "user", "content": "My name is Test Applicant."},
                            ]
                        },
                    },
                    {
                        "event_type": "application.perception_analysis",
                        "properties": {
                            "analysis": "The applicant maintained steady eye contact and appeared calm."
                        },
                    },
                ],
            }
        if path == "/replicas":
            return {"data": [{"replica_id": "r_test", "replica_name": "Test Officer"}]}
        if path == "/personas" and method == "POST":
            self.create_count += 1
            return {"persona_id": f"p_new_{self.create_count}"}
        if path == "/objectives" and method == "POST":
            return {"objectives_id": "o_test"}
        if path == "/guardrails" and method == "POST":
            return {"guardrail_id": "g_test"}
        if path == "/documents" and method == "POST":
            return {"document_id": "d_test"}
        if path == "/pronunciation-dictionaries" and method == "POST":
            return {"pronunciation_dictionary_id": "pd_test"}
        return {}


@pytest.fixture
def fake_client() -> FakeTavusClient:
    return FakeTavusClient()


@pytest.fixture
def client(fake_client: FakeTavusClient) -> TestClient:
    """A TestClient with app.state populated manually (lifespan is bypassed)."""
    app.state.settings = SimpleNamespace(
        tavus_api_key="sk-test",
        tavus_replica_id="r_test",
        tavus_llm_model="tavus-gpt-oss",
        cors_origin="http://localhost:5173",
        port=8787,
        interview_duration_seconds=240,
        default_language="english",
        civics_document_url="",
        public_base_url=None,
        enable_recording=False,
        recording_provider="s3",
        recording_bucket=None,
        recording_region=None,
        recording_role_arn=None,
    )
    app.state.client = fake_client
    app.state.personas = {
        "b1b2": "p_b1b2",
        "f1": "p_f1",
        "h1b": "p_h1b",
        "j1": "p_j1",
        "n400": "p_n400",
    }
    app.state.events = {}
    # Not used as a context manager, so the real lifespan never runs.
    return TestClient(app)
