"""Provision all Tavus resources and the personas that reference them.

Shared by the app's startup `lifespan` and the one-shot `scripts/provision.py`.
Each dependency is best-effort: if its API call fails, we log and continue without
that feature rather than failing startup. Guardrails, objectives, the civics
document, and the pronunciation dictionary are attached to the personas here, so
at runtime only the persona ids are needed (see Settings.preset_personas).
"""

from __future__ import annotations

import logging

from .config import Settings
from .documents import ensure_civics_document
from .guardrails import ensure_guardrails
from .objectives import ensure_objectives
from .personas import VISA_TYPES, PersonaDeps, PersonaMap, VisaType, ensure_personas
from .pronunciation import ensure_pronunciation_dictionary
from .tavus import TavusApiError, TavusClient

logger = logging.getLogger("visadrill")


async def provision(client: TavusClient, settings: Settings) -> PersonaMap:
    """Create (or reuse) every Tavus resource and return the persona ids per visa."""
    guardrail_ids: list[str] = []
    try:
        guardrail_ids = await ensure_guardrails(client)
    except (TavusApiError, RuntimeError) as err:
        logger.warning("guardrails disabled: %s", err)

    pronunciation_id: str | None = None
    try:
        pronunciation_id = await ensure_pronunciation_dictionary(client)
    except (TavusApiError, RuntimeError) as err:
        logger.warning("pronunciation dictionary disabled: %s", err)

    civics_doc_ids: list[str] = []
    if settings.civics_document_url:
        try:
            civics_doc_ids = [await ensure_civics_document(client, settings.civics_document_url)]
        except (TavusApiError, RuntimeError) as err:
            logger.warning("civics knowledge base disabled: %s", err)

    objectives_by_visa: dict[VisaType, str] = {}
    try:
        objectives_by_visa = await ensure_objectives(client)
    except (TavusApiError, RuntimeError) as err:
        logger.warning("objectives disabled: %s", err)

    deps_by_visa: dict[VisaType, PersonaDeps] = {
        visa: PersonaDeps(
            guardrail_ids=guardrail_ids,
            objectives_id=objectives_by_visa.get(visa),
            document_ids=civics_doc_ids if visa == "n400" else [],
            pronunciation_dictionary_id=pronunciation_id,
        )
        for visa in VISA_TYPES
    }
    return await ensure_personas(
        client, settings.tavus_replica_id, settings.tavus_llm_model, deps_by_visa
    )
