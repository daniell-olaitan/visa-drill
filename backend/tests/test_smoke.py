"""Smoke tests for the VisaDrill backend: routes (mocked Tavus) and persona logic."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import cast

import pytest
from fastapi.testclient import TestClient

from app import cache
from app.config import load_settings
from app.personas import (
    SPECS,
    VISA_TYPES,
    PersonaDeps,
    VisaType,
    build_persona_payload,
    ensure_personas,
)
from app.tavus import TavusClient
from tests.conftest import FakeTavusClient


def test_health(client: TestClient) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["api_key_valid"] is True
    assert body["replica_id"] == "r_test"
    assert set(body["personas"]) == {"b1b2", "f1", "h1b", "j1", "n400"}


def test_list_replicas(client: TestClient) -> None:
    res = client.get("/api/replicas")
    assert res.status_code == 200
    assert res.json() == [{"replica_id": "r_test", "replica_name": "Test Officer"}]


def test_waitlist_valid(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("WAITLIST_FILE", str(tmp_path / "waitlist.jsonl"))
    res = client.post("/api/waitlist", json={"email": "Me@Example.com"})
    assert res.status_code == 200
    body = res.json()
    assert body["error"] is None
    assert body["data"]["email"] == "me@example.com"  # normalised
    assert (tmp_path / "waitlist.jsonl").exists()


def test_waitlist_invalid_email(client: TestClient) -> None:
    res = client.post("/api/waitlist", json={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_EMAIL"


def test_waitlist_admin_list(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("WAITLIST_FILE", str(tmp_path / "waitlist.jsonl"))
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    client.post("/api/waitlist", json={"email": "a@b.com"})

    assert client.get("/api/waitlist").status_code == 401  # no/wrong token
    res = client.get("/api/waitlist", headers={"X-Admin-Token": "secret"})
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert body["data"][0]["email"] == "a@b.com"


def test_waitlist_admin_disabled_without_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    assert client.get("/api/waitlist").status_code == 404


def test_start_session_valid(client: TestClient, fake_client: FakeTavusClient) -> None:
    res = client.post("/api/start-session", json={"visa_type": "b1b2"})
    assert res.status_code == 200
    assert res.json() == {
        "conversation_url": "https://tavus.daily.co/c123",
        "conversation_id": "c123",
    }
    post = next(c for c in fake_client.calls if c[0] == "POST" and c[1] == "/conversations")
    payload = post[2]
    assert payload is not None
    assert payload["persona_id"] == "p_b1b2"
    assert payload["replica_id"] == "r_test"
    assert payload["custom_greeting"] == SPECS["b1b2"].greeting
    props = payload["properties"]
    assert props["max_call_duration"] > 0
    assert props["language"] == "english"
    assert "memory_stores" not in payload  # no applicant id sent


def test_start_session_with_applicant_and_language(
    client: TestClient, fake_client: FakeTavusClient
) -> None:
    res = client.post(
        "/api/start-session",
        json={"visa_type": "f1", "language": "spanish", "applicant_id": "user-42"},
    )
    assert res.status_code == 200
    post = next(c for c in fake_client.calls if c[0] == "POST" and c[1] == "/conversations")
    payload = post[2]
    assert payload is not None
    assert payload["properties"]["language"] == "spanish"
    assert payload["memory_stores"] == ["user-42-f1"]


def test_embed_maps_category_to_persona(client: TestClient, fake_client: FakeTavusClient) -> None:
    res = client.post("/api/liveavatar/embed", json={"category": "h1b"})
    assert res.status_code == 200
    body = res.json()
    assert body["url"] == "https://tavus.daily.co/c123"
    assert body["conversation_id"] == "c123"
    # h1b now has its own dedicated officer persona.
    post = next(c for c in fake_client.calls if c[0] == "POST" and c[1] == "/conversations")
    assert post[2] is not None
    assert post[2]["persona_id"] == "p_h1b"


def test_embed_includes_applicant_context(client: TestClient, fake_client: FakeTavusClient) -> None:
    res = client.post(
        "/api/liveavatar/embed",
        json={"category": "b1b2", "applicant_context": "Purpose of trip: visiting family."},
    )
    assert res.status_code == 200
    post = next(c for c in fake_client.calls if c[0] == "POST" and c[1] == "/conversations")
    assert post[2] is not None
    assert "visiting family" in post[2]["conversational_context"]


def test_start_session_invalid_visa(client: TestClient) -> None:
    res = client.post("/api/start-session", json={"visa_type": "tourist"})
    assert res.status_code == 422  # rejected by the Literal schema


def test_start_session_tavus_error(client: TestClient, fake_client: FakeTavusClient) -> None:
    fake_client.fail_paths.add("/conversations")
    res = client.post("/api/start-session", json={"visa_type": "f1"})
    assert res.status_code == 502


def test_end_session(client: TestClient, fake_client: FakeTavusClient) -> None:
    res = client.post("/api/end-session", json={"conversation_id": "c123"})
    assert res.status_code == 200
    assert res.json() == {"ended": True}
    assert ("POST", "/conversations/c123/end", None) in fake_client.calls


def test_end_session_swallows_errors(client: TestClient, fake_client: FakeTavusClient) -> None:
    fake_client.fail_paths.add("/conversations/c123/end")
    res = client.post("/api/end-session", json={"conversation_id": "c123"})
    assert res.status_code == 200
    assert res.json() == {"ended": True}


def test_report(client: TestClient) -> None:
    res = client.get("/api/report/c123")
    assert res.status_code == 200
    body = res.json()
    assert body["conversation_id"] == "c123"
    assert body["status"] == "ended"
    assert body["ready"] is True
    assert len(body["transcript"]) == 2
    assert body["transcript"][1]["content"] == "My name is Test Applicant."
    assert "eye contact" in body["perception_analysis"]


def test_parse_events_excludes_system_prompt() -> None:
    from app.main import _parse_events

    events = [
        {
            "event_type": "application.transcription_ready",
            "properties": {
                "transcript": [
                    {"role": "system", "content": "You are a U.S. consular officer " + "x" * 200},
                    {"role": "assistant", "content": "Good morning. Please state your name."},
                    {"role": "user", "content": "Hello."},
                    {"role": "assistant", "content": "How long will you stay?"},
                ]
            },
        },
        {
            "event_type": "application.perception_analysis",
            "properties": {"analysis": "Calm, steady eye contact."},
        },
    ]
    transcript, perception, recording = _parse_events(events)
    assert [t.role for t in transcript] == ["assistant", "user", "assistant"]
    assert all("consular officer" not in t.content for t in transcript)
    assert perception == "Calm, steady eye contact."

    # A prompt-sized blob is dropped even if mislabeled as a spoken role.
    big = [
        {
            "event_type": "application.transcription_ready",
            "properties": {
                "transcript": [
                    {"role": "assistant", "content": "Y" * 5000},
                    {"role": "assistant", "content": "Short line."},
                ]
            },
        }
    ]
    turns, _, _ = _parse_events(big)
    assert [t.content for t in turns] == ["Short line."]


def test_webhook_stores_event(client: TestClient) -> None:
    from app.main import app

    event = {"event_type": "application.recording_ready", "conversation_id": "c999"}
    res = client.post("/api/webhook", json=event)
    assert res.status_code == 200
    assert res.json() == {"received": True}
    assert app.state.events["c999"][0]["event_type"] == "application.recording_ready"


def test_build_persona_payload_has_all_layers() -> None:
    deps = PersonaDeps(
        guardrail_ids=["g1", "g2"],
        objectives_id="o1",
        document_ids=["d1"],
        pronunciation_dictionary_id="pd1",
    )
    payload = build_persona_payload(SPECS["n400"], "r_test", "tavus-gpt-oss", deps)
    assert "repeat or rephrase the question" in payload["system_prompt"]  # silence handling
    layers = payload["layers"]
    assert layers["perception"]["perception_model"] == "raven-1"
    assert layers["perception"]["perception_analysis_queries"]
    assert layers["stt"]["hotwords"]
    assert layers["conversational_flow"]["replica_interruptibility"] == "high"
    assert layers["conversational_flow"]["idle_engagement"] == "eager"
    assert layers["tts"]["pronunciation_dictionary_id"] == "pd1"
    assert payload["guardrail_ids"] == ["g1", "g2"]
    assert payload["objectives_id"] == "o1"
    assert payload["document_ids"] == ["d1"]


def test_persona_hash_reflects_dependencies() -> None:
    base = build_persona_payload(SPECS["b1b2"], "r_test", "tavus-gpt-oss", PersonaDeps())
    with_guardrails = build_persona_payload(
        SPECS["b1b2"], "r_test", "tavus-gpt-oss", PersonaDeps(guardrail_ids=["g1"])
    )
    diff_model = build_persona_payload(SPECS["b1b2"], "r_test", "tavus-gemini-3-flash", PersonaDeps())
    assert cache.hash_spec(base) != cache.hash_spec(with_guardrails)
    assert cache.hash_spec(base) != cache.hash_spec(diff_model)


def _deps_by_visa() -> dict[VisaType, PersonaDeps]:
    return {visa: PersonaDeps(guardrail_ids=["g1"], objectives_id="o1") for visa in VISA_TYPES}


def test_ensure_personas_creates_reuses_resyncs(
    fake_client: FakeTavusClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(cache, "CACHE_DIR", tmp_path)
    tavus = cast(TavusClient, fake_client)
    deps = _deps_by_visa()
    n = len(VISA_TYPES)

    # First run: nothing cached -> one persona created per visa type.
    first = asyncio.run(ensure_personas(tavus, "r_test", "tavus-gpt-oss", deps))
    assert set(first) == set(VISA_TYPES)
    assert fake_client.create_count == n

    # Mark them as existing; same inputs -> reuse, no new creates.
    fake_client.existing.update(first.values())
    second = asyncio.run(ensure_personas(tavus, "r_test", "tavus-gpt-oss", deps))
    assert second == first
    assert fake_client.create_count == n

    # Change the model -> payload hash differs -> re-created (the staleness fix).
    third = asyncio.run(ensure_personas(tavus, "r_test", "tavus-gemini-3-flash", deps))
    assert fake_client.create_count == 2 * n
    assert third != first


def test_objectives_link_chain_single_root() -> None:
    from app.objectives import OBJECTIVES, link_chain

    chained = link_chain(OBJECTIVES["n400"])
    names = {o["objective_name"] for o in chained}
    referenced = {o["next_required_objective"] for o in chained if "next_required_objective" in o}
    # Tavus requires exactly one root (an objective not referenced by any other).
    assert len(names - referenced) == 1
    # Source specs are not mutated.
    assert "next_required_objective" not in OBJECTIVES["n400"][0]


def test_load_settings_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import config

    monkeypatch.delenv("TAVUS_API_KEY", raising=False)
    monkeypatch.setattr(
        config.Settings,
        "model_config",
        {**config.Settings.model_config, "env_file": "/nonexistent/visa-drill/.env"},
    )
    with pytest.raises(RuntimeError, match="TAVUS_API_KEY is not set"):
        load_settings()


def test_preset_personas(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import config

    monkeypatch.setattr(
        config.Settings,
        "model_config",
        {**config.Settings.model_config, "env_file": "/nonexistent/.env"},
    )
    monkeypatch.setenv("TAVUS_API_KEY", "sk-test")

    keys = ("PERSONA_B1B2_ID", "PERSONA_F1_ID", "PERSONA_H1B_ID", "PERSONA_J1_ID", "PERSONA_N400_ID")

    # None set -> None (app provisions normally).
    for key in keys:
        monkeypatch.delenv(key, raising=False)
    assert config.load_settings().preset_personas() is None

    # Partial -> still None.
    monkeypatch.setenv("PERSONA_B1B2_ID", "p1")
    monkeypatch.setenv("PERSONA_F1_ID", "p2")
    assert config.load_settings().preset_personas() is None

    # All set -> the full map.
    monkeypatch.setenv("PERSONA_H1B_ID", "p3")
    monkeypatch.setenv("PERSONA_J1_ID", "p4")
    monkeypatch.setenv("PERSONA_N400_ID", "p5")
    assert config.load_settings().preset_personas() == {
        "b1b2": "p1",
        "f1": "p2",
        "h1b": "p3",
        "j1": "p4",
        "n400": "p5",
    }


def test_recording_storage_builder(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import config

    monkeypatch.setattr(
        config.Settings,
        "model_config",
        {**config.Settings.model_config, "env_file": "/nonexistent/.env"},
    )
    monkeypatch.setenv("TAVUS_API_KEY", "sk-test")

    # Disabled -> no storage.
    monkeypatch.setenv("ENABLE_RECORDING", "false")
    assert config.load_settings().recording_storage() is None

    # Azure Blob -> federated config.
    monkeypatch.setenv("ENABLE_RECORDING", "true")
    monkeypatch.setenv("RECORDING_PROVIDER", "azure_blob")
    monkeypatch.setenv("RECORDING_AZURE_STORAGE_ACCOUNT", "acct")
    monkeypatch.setenv("RECORDING_AZURE_CONTAINER", "rec")
    monkeypatch.setenv("RECORDING_AZURE_TENANT_ID", "t1")
    monkeypatch.setenv("RECORDING_AZURE_CLIENT_ID", "c1")
    assert config.load_settings().recording_storage() == {
        "provider": "azure_blob",
        "storage_account": "acct",
        "container": "rec",
        "tenant_id": "t1",
        "client_id": "c1",
    }

    # Azure missing required fields -> None (caller omits storage).
    monkeypatch.delenv("RECORDING_AZURE_CONTAINER")
    assert config.load_settings().recording_storage() is None


def test_recording_storage_force_ignores_enable_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    from app import config

    monkeypatch.setattr(
        config.Settings,
        "model_config",
        {**config.Settings.model_config, "env_file": "/nonexistent/.env"},
    )
    monkeypatch.setenv("TAVUS_API_KEY", "sk-test")
    monkeypatch.setenv("ENABLE_RECORDING", "false")  # not enabled yet
    monkeypatch.setenv("RECORDING_PROVIDER", "azure_blob")
    monkeypatch.setenv("RECORDING_AZURE_STORAGE_ACCOUNT", "acct")
    monkeypatch.setenv("RECORDING_AZURE_CONTAINER", "rec")

    settings = config.load_settings()
    # The verify script probes configured-but-disabled providers via force=True.
    assert settings.recording_storage() is None
    forced = settings.recording_storage(force=True)
    assert forced is not None
    assert forced["provider"] == "azure_blob"
