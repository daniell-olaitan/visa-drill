"""Thin async client for the avatar provider's v2 REST API.

Injects the API key header, sets Content-Type, and raises a typed error on
non-2xx responses.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://tavusapi.com/v2"


class AvatarApiError(Exception):
    """Raised when the provider API returns a non-2xx response."""

    def __init__(self, status_code: int, path: str, body: str) -> None:
        self.status_code = status_code
        self.path = path
        self.body = body
        super().__init__(f"the provider API {path} -> {status_code}: {body[:500]}")


class AvatarClient:
    """Async wrapper around the provider v2 API."""

    # Persona creation (the heaviest call, built once at startup) can take well
    # over 30s, so give read operations a generous ceiling. Connect stays short.
    def __init__(self, api_key: str, *, timeout: float = 90.0) -> None:
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"x-api-key": api_key},
            timeout=httpx.Timeout(timeout, connect=10.0),
        )

    async def aclose(self) -> None:
        """Close the underlying HTTP connection pool."""
        await self._client.aclose()

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """Perform a raw request and return the response without raising on status."""
        return await self._client.request(method, path, json=json, params=params)

    async def request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Perform a request and return parsed JSON, raising `AvatarApiError` on failure."""
        response = await self.request(method, path, json=json, params=params)
        if response.is_success:
            if not response.content:
                return {}
            return response.json()
        raise AvatarApiError(response.status_code, path, response.text)
