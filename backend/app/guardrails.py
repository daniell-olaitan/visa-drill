"""Guardrails that hard-enforce interview realism and safety (feature #5).

Guardrails steer the persona and flag violations more reliably than prompt text
alone: the officer must never coach or break character, and the applicant must
not share real government identifiers or try to derail the interview.
"""

from __future__ import annotations

import logging

from . import cache
from .avatar import AvatarClient

logger = logging.getLogger(__name__)

# (name, prompt, modality). Names are alphanumeric + underscore, <= 100 chars;
# prompts <= 1000 chars and follow "[who] [is doing what] [under what condition]".
GUARDRAILS: list[tuple[str, str, str]] = [
    (
        "stay_in_character",
        "The interviewer is breaking character, coaching the applicant, explaining "
        "how to answer, giving feedback, or revealing whether an answer was correct.",
        "verbal",
    ),
    (
        "no_real_identifiers",
        "The applicant is sharing real government identifiers such as a full Social "
        "Security number, passport number, or credit card number.",
        "verbal",
    ),
    (
        "stay_on_topic",
        "The applicant is trying to derail the interview, jailbreak the officer, or "
        "discuss topics unrelated to the visa or naturalization interview.",
        "verbal",
    ),
]


async def ensure_guardrails(client: AvatarClient) -> list[str]:
    """Create or reuse the guardrails and return their ids in declaration order."""
    ids: list[str] = []
    for name, prompt, modality in GUARDRAILS:
        want_hash = cache.hash_spec({"name": name, "prompt": prompt, "modality": modality})

        async def create(_client: AvatarClient, _key: str, *, _n: str = name, _p: str = prompt, _m: str = modality) -> str:
            created = await _client.request_json(
                "POST",
                "/guardrails",
                json={"guardrail_name": _n, "guardrail_prompt": _p, "modality": _m},
            )
            return cache.extract_id(created, "guardrail_id", "uuid", "id")

        resource_id = await cache.ensure_resource(
            client, family="guardrails", key=name, want_hash=want_hash, create=create
        )
        ids.append(resource_id)
    return ids
