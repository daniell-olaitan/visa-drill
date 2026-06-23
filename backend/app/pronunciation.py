"""A pronunciation dictionary so the officer says domain terms correctly (feature #9).

Acronyms and visa codes are otherwise mangled by TTS ("USCIS" read as a word,
"N-400" as "en dash four hundred"). The dictionary is attached to every persona
via `layers.tts.pronunciation_dictionary_id`.
"""

from __future__ import annotations

import logging

from . import cache
from .tavus import TavusClient

logger = logging.getLogger(__name__)

# (text, pronunciation, type). "alias" substitutes spoken text; see TAVUS_GUIDE.md.
RULES: list[dict[str, str]] = [
    {"text": "USCIS", "pronunciation": "U S C I S", "type": "alias"},
    {"text": "N-400", "pronunciation": "N four hundred", "type": "alias"},
    {"text": "B1/B2", "pronunciation": "B one B two", "type": "alias"},
    {"text": "F-1", "pronunciation": "F one", "type": "alias"},
    {"text": "DS-160", "pronunciation": "D S one sixty", "type": "alias"},
    {"text": "visa", "pronunciation": "VEE-zuh", "type": "alias"},
]


async def ensure_pronunciation_dictionary(client: TavusClient) -> str:
    """Create or reuse the pronunciation dictionary and return its id."""
    want_hash = cache.hash_spec({"name": "visadrill-terms", "rules": RULES})

    async def create(_client: TavusClient, _key: str) -> str:
        created = await _client.request_json(
            "POST",
            "/pronunciation-dictionaries",
            json={"name": "visadrill-terms", "rules": RULES},
        )
        return cache.extract_id(created, "pronunciation_dictionary_id", "id", "uuid")

    return await cache.ensure_resource(
        client, family="pronunciation", key="terms", want_hash=want_hash, create=create
    )
