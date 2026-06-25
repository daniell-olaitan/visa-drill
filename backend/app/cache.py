"""Generic create-or-reuse cache for the provider resources, keyed by a content hash.

Every provisioned the provider resource (persona, objective set, guardrail, document,
pronunciation dictionary) follows the same lifecycle: hash its spec, reuse the
cached id when the hash is unchanged (and the resource still exists), otherwise
create a fresh one. This module centralizes that so each resource module only
declares its specs and how to create one.
"""

from __future__ import annotations

import hashlib
import json
import logging
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .avatar import AvatarClient

logger = logging.getLogger(__name__)

CACHE_DIR: Path = Path(__file__).resolve().parents[1] / ".cache"


class ResourceRecord(BaseModel):
    """A cached resource id plus the spec hash it was created from."""

    resource_id: str
    spec_hash: str


def cache_path(name: str) -> Path:
    """Return the on-disk cache file for a resource family (e.g. "personas")."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{name}.json"


def hash_spec(spec: Any) -> str:
    """Stable SHA-256 of any JSON-serializable spec."""
    payload = json.dumps(spec, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def extract_id(payload: dict[str, Any], *candidates: str) -> str:
    """Pull the first present string id from a create response, trying each key."""
    for key in candidates:
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    raise RuntimeError(f"no id field {candidates} in the provider response: {payload}")


def _read(path: Path) -> dict[str, ResourceRecord]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    out: dict[str, ResourceRecord] = {}
    for key, value in raw.items():
        try:
            out[key] = ResourceRecord.model_validate(value)
        except ValueError:
            continue
    return out


def _write(path: Path, records: dict[str, ResourceRecord]) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(
        json.dumps({k: v.model_dump() for k, v in records.items()}, indent=2),
        encoding="utf-8",
    )
    tmp.replace(path)


ExistsFn = Callable[[AvatarClient, str], Awaitable[bool]]
CreateFn = Callable[[AvatarClient, str], Awaitable[str]]


async def ensure_resource(
    client: AvatarClient,
    *,
    family: str,
    key: str,
    want_hash: str,
    create: CreateFn,
    exists: ExistsFn | None = None,
) -> str:
    """Reuse a cached resource when the hash matches (and it still exists), else create it.

    `create(client, key)` provisions the resource and returns its id. `exists`, if
    given, verifies a cached id is still live remotely; when omitted, a hash match
    alone is trusted (used for resources without a cheap existence check).
    """
    path = cache_path(family)
    cache = _read(path)
    cached = cache.get(key)
    if cached is not None and cached.spec_hash == want_hash:
        if exists is None or await exists(client, cached.resource_id):
            logger.info("reusing %s/%s -> %s", family, key, cached.resource_id)
            return cached.resource_id

    resource_id = await create(client, key)
    cache[key] = ResourceRecord(resource_id=resource_id, spec_hash=want_hash)
    _write(path, cache)
    logger.info("created %s/%s -> %s", family, key, resource_id)
    return resource_id
