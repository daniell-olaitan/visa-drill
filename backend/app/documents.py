"""Knowledge-base document grounding the N-400 civics test in real USCIS material (feature #4).

The official USCIS 100 civics questions are uploaded as a provider document and attached
to the naturalization persona, so the civics test is grounded in current, authoritative
content instead of the LLM's memory.
"""

from __future__ import annotations

import logging

from . import cache
from .avatar import AvatarClient

logger = logging.getLogger(__name__)


async def ensure_civics_document(client: AvatarClient, document_url: str) -> str:
    """Create or reuse the USCIS civics knowledge-base document and return its id."""
    want_hash = cache.hash_spec({"url": document_url, "name": "USCIS 100 Civics Questions"})

    async def create(_client: AvatarClient, _key: str) -> str:
        created = await _client.request_json(
            "POST",
            "/documents",
            json={
                "document_name": "USCIS 100 Civics Questions",
                "document_url": document_url,
                "tags": ["n400", "civics"],
            },
        )
        return cache.extract_id(created, "document_id", "uuid", "id")

    return await cache.ensure_resource(
        client, family="documents", key="civics", want_hash=want_hash, create=create
    )
