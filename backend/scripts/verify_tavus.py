"""Probe a Tavus account/key to see which VisaDrill features it supports.

Creates a throwaway instance of each resource (guardrail, objective, document,
pronunciation dictionary, persona) and an optional `test_mode` conversation, reports
which succeed, then cleans them up. `test_mode` conversations do not bill minutes,
so this is safe to run on the free plan.

Run once `.env` has TAVUS_API_KEY (path is independent of the working directory):

    python backend/scripts/verify_tavus.py
    python backend/scripts/verify_tavus.py --skip-conversation   # skip conversation probes
    python backend/scripts/verify_tavus.py --keep                # leave created resources
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import cache  # noqa: E402
from app.config import load_settings  # noqa: E402
from app.guardrails import GUARDRAILS  # noqa: E402
from app.objectives import OBJECTIVES, link_chain  # noqa: E402
from app.personas import SPECS, PersonaDeps, build_persona_payload  # noqa: E402
from app.pronunciation import RULES  # noqa: E402
from app.tavus import TavusClient  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("verify")


class ProbeError(Exception):
    """A Tavus call returned a non-2xx response during probing."""


async def _create(client: TavusClient, path: str, payload: dict, *id_fields: str) -> str:
    response = await client.request("POST", path, json=payload)
    if not response.is_success:
        raise ProbeError(f"{response.status_code}: {response.text[:200]}")
    return cache.extract_id(response.json(), *id_fields)


async def _delete(client: TavusClient, path: str, *, keep: bool) -> None:
    if keep:
        return
    try:
        await client.request("DELETE", path)
    except Exception:  # noqa: BLE001 - cleanup is best-effort
        pass


def _report(results: list[tuple[str, bool, str]]) -> None:
    logger.info("\n=== VisaDrill / Tavus feature support ===")
    width = max(len(name) for name, _, _ in results)
    for name, ok, detail in results:
        mark = "OK  " if ok else "FAIL"
        logger.info("[%s] %s  %s", mark, name.ljust(width), detail)
    supported = sum(1 for _, ok, _ in results if ok)
    logger.info("\n%d/%d checks passed.", supported, len(results))


async def run(args: argparse.Namespace) -> int:
    settings = load_settings()
    client = TavusClient(settings.tavus_api_key)
    results: list[tuple[str, bool, str]] = []
    created: list[tuple[str, str]] = []  # (delete_path, label) for cleanup

    try:
        # --- API key ---
        key_check = await client.request("GET", "/personas", params={"limit": 1})
        if key_check.status_code == 401:
            logger.error("API key invalid (401). Set a valid TAVUS_API_KEY in .env.")
            return 1
        if not key_check.is_success:
            logger.error("Key check failed: %s %s", key_check.status_code, key_check.text[:200])
            return 1
        results.append(("API key", True, "valid"))

        # --- Stock replica (configured) ---
        try:
            data = await client.request("GET", "/replicas", params={"replica_type": "system", "limit": 100})
            ids = {r.get("replica_id") for r in (data.json().get("data", []) if data.is_success else [])}
            present = settings.tavus_replica_id in ids
            results.append((
                "Stock replica",
                present,
                f"{settings.tavus_replica_id} {'found' if present else 'NOT in stock list - check TAVUS_REPLICA_ID'}",
            ))
        except Exception as err:  # noqa: BLE001
            results.append(("Stock replica", False, str(err)))

        # --- #5 Guardrails ---
        guardrail_id: str | None = None
        try:
            name, prompt, modality = GUARDRAILS[0]
            guardrail_id = await _create(
                client,
                "/guardrails",
                {"guardrail_name": f"verify_{name}", "guardrail_prompt": prompt, "modality": modality},
                "guardrail_id",
                "uuid",
                "id",
            )
            created.append((f"/guardrails/{guardrail_id}", "guardrail"))
            results.append(("#5 Guardrails", True, f"created {guardrail_id}"))
        except (ProbeError, RuntimeError) as err:
            results.append(("#5 Guardrails", False, str(err)))

        # --- #2 Objectives ---
        objectives_id: str | None = None
        try:
            objectives_id = await _create(
                client, "/objectives", {"data": link_chain(OBJECTIVES["n400"])}, "objectives_id", "id"
            )
            created.append((f"/objectives/{objectives_id}", "objectives"))
            results.append(("#2 Objectives", True, f"created {objectives_id}"))
        except (ProbeError, RuntimeError) as err:
            results.append(("#2 Objectives", False, str(err)))

        # --- #4 Knowledge base (RAG) ---
        document_id: str | None = None
        if settings.civics_document_url:
            try:
                document_id = await _create(
                    client,
                    "/documents",
                    {
                        "document_name": "verify-civics",
                        "document_url": settings.civics_document_url,
                        "tags": ["verify"],
                    },
                    "document_id",
                    "uuid",
                    "id",
                )
                created.append((f"/documents/{document_id}", "document"))
                results.append(("#4 Knowledge base", True, f"created {document_id}"))
            except (ProbeError, RuntimeError) as err:
                results.append(("#4 Knowledge base", False, str(err)))
        else:
            results.append(("#4 Knowledge base", False, "CIVICS_DOCUMENT_URL is empty"))

        # --- #9 Pronunciation dictionary ---
        pronunciation_id: str | None = None
        try:
            pronunciation_id = await _create(
                client,
                "/pronunciation-dictionaries",
                {"name": "verify-terms", "rules": RULES},
                "pronunciation_dictionary_id",
                "id",
                "uuid",
            )
            created.append((f"/pronunciation-dictionaries/{pronunciation_id}", "pronunciation"))
            results.append(("#9 Pronunciation", True, f"created {pronunciation_id}"))
        except (ProbeError, RuntimeError) as err:
            results.append(("#9 Pronunciation", False, str(err)))

        # --- #1 Perception + #6 Flow/STT (persona create with all layers) ---
        persona_id: str | None = None
        deps = PersonaDeps(
            guardrail_ids=[guardrail_id] if guardrail_id else [],
            objectives_id=objectives_id,
            document_ids=[document_id] if document_id else [],
            pronunciation_dictionary_id=pronunciation_id,
        )
        payload = build_persona_payload(SPECS["n400"], settings.tavus_replica_id, settings.tavus_llm_model, deps)
        try:
            persona_id = await _create(client, "/personas", payload, "persona_id", "id")
            created.append((f"/personas/{persona_id}", "persona"))
            results.append(("#1 Perception (Raven)", True, f"persona {persona_id} accepted raven-1 layer"))
            results.append(("#6 Flow + STT hotwords", True, "accepted in persona layers"))
        except (ProbeError, RuntimeError) as err:
            results.append(("#1 Perception (Raven)", False, str(err)))
            results.append(("#6 Flow + STT hotwords", False, "persona create failed"))

        # --- Conversation-level: #8 Language, #7 Memories, #3 Recording (test_mode) ---
        if args.skip_conversation:
            for feat in ("#8 Language", "#7 Memories", "#3 Recording"):
                results.append((feat, False, "skipped (--skip-conversation)"))
        elif persona_id is None:
            for feat in ("#8 Language", "#7 Memories", "#3 Recording"):
                results.append((feat, False, "skipped (no persona)"))
        else:
            base_props = {
                "language": settings.default_language,
                "enable_closed_captions": True,
                "max_call_duration": 60,
            }
            # Language + memory in one test_mode conversation.
            try:
                convo = await client.request(
                    "POST",
                    "/conversations",
                    json={
                        "persona_id": persona_id,
                        "replica_id": settings.tavus_replica_id,
                        "test_mode": True,
                        "memory_stores": ["verify-probe"],
                        "properties": base_props,
                    },
                )
                if convo.is_success:
                    cid = convo.json().get("conversation_id")
                    if isinstance(cid, str):
                        await _delete(client, f"/conversations/{cid}", keep=args.keep)
                    results.append(("#8 Language", True, f"'{settings.default_language}' accepted (test_mode)"))
                    results.append(("#7 Memories", True, "memory_stores accepted (test_mode)"))
                else:
                    detail = f"{convo.status_code}: {convo.text[:160]}"
                    results.append(("#8 Language", False, detail))
                    results.append(("#7 Memories", False, detail))
            except Exception as err:  # noqa: BLE001
                results.append(("#8 Language", False, str(err)))
                results.append(("#7 Memories", False, str(err)))

            # Recording in a separate test_mode conversation, including the real
            # recording_storage config when a provider is configured (validates the
            # S3 role / Azure federation shape without a billed call).
            storage = settings.recording_storage(force=True)
            rec_props: dict[str, object] = {**base_props, "enable_recording": True}
            if storage is not None:
                rec_props["recording_storage"] = storage
            try:
                rec = await client.request(
                    "POST",
                    "/conversations",
                    json={
                        "persona_id": persona_id,
                        "replica_id": settings.tavus_replica_id,
                        "test_mode": True,
                        "properties": rec_props,
                    },
                )
                if rec.is_success:
                    cid = rec.json().get("conversation_id")
                    if isinstance(cid, str):
                        await _delete(client, f"/conversations/{cid}", keep=args.keep)
                    detail = (
                        f"accepted ({storage['provider']} storage config)"
                        if storage is not None
                        else "enable_recording accepted (no storage configured - set RECORDING_PROVIDER + fields)"
                    )
                    results.append(("#3 Recording", True, detail))
                else:
                    results.append(("#3 Recording", False, f"{rec.status_code}: {rec.text[:160]}"))
            except Exception as err:  # noqa: BLE001
                results.append(("#3 Recording", False, str(err)))

        # --- Cleanup ---
        if created and not args.keep:
            logger.info("cleaning up %d created resource(s)...", len(created))
            for path, _label in reversed(created):
                await _delete(client, path, keep=False)
        elif args.keep and created:
            logger.info("--keep set; leaving %d resource(s) in your account.", len(created))

        _report(results)
        return 0
    finally:
        await client.aclose()


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe Tavus feature support for VisaDrill.")
    parser.add_argument("--skip-conversation", action="store_true", help="Skip test_mode conversation probes.")
    parser.add_argument("--keep", action="store_true", help="Do not delete created resources.")
    args = parser.parse_args()
    try:
        return asyncio.run(run(args))
    except RuntimeError as err:
        logger.error("%s", err)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
