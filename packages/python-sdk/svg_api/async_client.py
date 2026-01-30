"""
Async client implementation using aiohttp with connection pooling.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

import aiohttp

from svg_api.errors import (
    ApiError,
    NetworkError,
    NotFoundError,
    raise_for_status,
    TimeoutError,
)
from svg_api.types import (
    BatchIconRequest,
    BatchRequestOptions,
    BatchResponse,
    CategoriesResponse,
    Icon,
    IconResponse,
    RandomIconOptions,
    SearchOptions,
    SearchResponse,
    SourcesResponse,
)
from svg_api.utils import build_query_params, validate_color, validate_size, validate_stroke

if TYPE_CHECKING:
    from collections.abc import Mapping

DEFAULT_BASE_URL = "https://api.svg-api.org/v1"
DEFAULT_TIMEOUT = 30.0
USER_AGENT = "svg-api-python-async/1.0.0"


class AsyncSvgApiConfig:
    """Configuration for the async SVG API client."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        max_connections: int = 100,
        max_keepalive: int = 20,
        ttl_dns_cache: int = 300,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.max_connections = max_connections
        self.max_keepalive = max_keepalive
        self.ttl_dns_cache = ttl_dns_cache


class AsyncSvgApi:
    """
    Asynchronous client for the SVG API using aiohttp.
    
    Features:
    - Connection pooling for efficient HTTP reuse
    - Configurable retry logic with exponential backoff
    - Full async/await support
    
    Example:
        async with AsyncSvgApi() as client:
            icon = await client.get_icon("home", source="heroicons")
            print(icon.svg)
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        max_connections: int = 100,
        config: AsyncSvgApiConfig | None = None,
    ) -> None:
        if config is None:
            config = AsyncSvgApiConfig(
                base_url=base_url,
                api_key=api_key,
                timeout=timeout,
                max_retries=max_retries,
                retry_delay=retry_delay,
                max_connections=max_connections,
            )

        self._config = config
        self._session: aiohttp.ClientSession | None = None
        self._connector: aiohttp.TCPConnector | None = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with connection pool."""
        if self._session is None or self._session.closed:
            self._connector = aiohttp.TCPConnector(
                limit=self._config.max_connections,
                limit_per_host=10,
                ttl_dns_cache=self._config.ttl_dns_cache,
                use_dns_cache=True,
            )
            
            headers = {
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            }
            if self._config.api_key:
                headers["Authorization"] = f"Bearer {self._config.api_key}"

            timeout = aiohttp.ClientTimeout(total=self._config.timeout)
            
            self._session = aiohttp.ClientSession(
                base_url=self._config.base_url,
                connector=self._connector,
                headers=headers,
                timeout=timeout,
            )
        
        return self._session

    async def __aenter__(self) -> AsyncSvgApi:
        """Support async context manager protocol."""
        await self._get_session()
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Close the session on exit."""
        await self.close()

    async def close(self) -> None:
        """Close the HTTP session and connector."""
        if self._session and not self._session.closed:
            await self._session.close()
        if self._connector:
            await self._connector.close()

    async def _request(
        self,
        method: str,
        path: str,
        params: Mapping[str, Any] | None = None,
        json: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Make an async HTTP request with retry logic.
        """
        session = await self._get_session()
        
        last_error: Exception | None = None
        max_attempts = self._config.max_retries + 1

        for attempt in range(max_attempts):
            try:
                async with session.request(
                    method=method,
                    url=path,
                    params=params,
                    json=json,
                    headers=headers,
                ) as response:
                    return await self._handle_response(response)
                    
            except aiohttp.ClientResponseError as e:
                last_error = e
                if e.status < 500 or attempt == self._config.max_retries:
                    raise raise_for_status(e.status, {}, None)
                    
            except aiohttp.ClientConnectorError as e:
                last_error = NetworkError(f"Connection error: {e}")
                if attempt == self._config.max_retries:
                    raise last_error
                    
            except asyncio.TimeoutError as e:
                last_error = TimeoutError(
                    message="Request timed out",
                    timeout=self._config.timeout,
                )
                if attempt == self._config.max_retries:
                    raise last_error

            # Exponential backoff
            if attempt < self._config.max_retries:
                delay = self._config.retry_delay * (2 ** attempt)
                await asyncio.sleep(delay)

        raise last_error or ApiError("Request failed after retries")

    async def _handle_response(self, response: aiohttp.ClientResponse) -> dict[str, Any]:
        """Handle API response, raising appropriate exceptions."""
        request_id = response.headers.get("X-Request-Id")
        
        try:
            data = await response.json()
        except Exception:
            data = {}

        if response.status >= 400:
            raise raise_for_status(response.status, data, request_id)

        return data

    async def get_icon(
        self,
        name: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> Icon:
        """Get a single icon by name (async)."""
        if size is not None and not validate_size(size):
            from svg_api.errors import InvalidRequestError
            raise InvalidRequestError(
                message="Size must be between 8 and 512",
                code="INVALID_SIZE",
            )
        if stroke is not None and not validate_stroke(stroke):
            from svg_api.errors import InvalidRequestError
            raise InvalidRequestError(
                message="Stroke must be between 0.5 and 3",
                code="INVALID_STROKE",
            )
        if color is not None and not validate_color(color):
            from svg_api.errors import InvalidRequestError
            raise InvalidRequestError(
                message="Invalid color format",
                code="INVALID_COLOR",
            )

        params = build_query_params({
            "source": source,
            "size": size,
            "stroke": stroke,
            "color": color,
        })
        data = await self._request("GET", f"/icons/{name}", params=params)
        return IconResponse(**data).data

    async def get_icon_svg(
        self,
        name: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> str:
        """Get raw SVG content for an icon (async)."""
        icon = await self.get_icon(name, source, size, stroke, color)
        return icon.svg

    async def download_icon(
        self,
        name: str,
        path: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> str:
        """Download an icon to a file (async)."""
        import aiofiles
        import pathlib

        svg = await self.get_icon_svg(name, source, size, stroke, color)
        path_obj = pathlib.Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path_obj, "w", encoding="utf-8") as f:
            await f.write(svg)
        return str(path_obj.absolute())

    async def search(
        self,
        query: str,
        source: str | None = None,
        category: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResponse:
        """Search for icons (async)."""
        params = build_query_params({
            "q": query,
            "source": source,
            "category": category,
            "limit": min(limit, 100),
            "offset": offset,
        })
        data = await self._request("GET", "/search", params=params)
        return SearchResponse(**data)

    async def get_batch(
        self,
        icons: list[dict[str, Any]],
        defaults: dict[str, Any] | None = None,
    ) -> BatchResponse:
        """Fetch multiple icons in a single request (async)."""
        icon_requests = [BatchIconRequest(**icon) for icon in icons]
        defaults_obj = BatchIconRequest(**defaults) if defaults else BatchIconRequest(name="")
        batch_request = BatchRequestOptions(
            icons=icon_requests,
            defaults=BatchIconRequest(
                name="",
                size=defaults_obj.size or 24,
                stroke=defaults_obj.stroke or 2,
            ),
        )

        data = await self._request(
            "POST",
            "/icons/batch",
            json=batch_request.model_dump(by_alias=True, exclude_none=True),
        )
        return BatchResponse(**data)

    async def get_sources(self) -> SourcesResponse:
        """List all available icon sources (async)."""
        data = await self._request("GET", "/sources")
        return SourcesResponse(**data)

    async def get_categories(self, source: str | None = None) -> CategoriesResponse:
        """List all icon categories (async)."""
        params = build_query_params({"source": source})
        data = await self._request("GET", "/categories", params=params)
        return CategoriesResponse(**data)

    async def get_random(
        self,
        source: str | None = None,
        category: str | None = None,
    ) -> Icon:
        """Get a random icon (async)."""
        params = build_query_params({"source": source, "category": category})
        data = await self._request("GET", "/random", params=params)
        return IconResponse(**data).data

    async def get_batch_optimized(
        self,
        icons: list[dict[str, Any]],
        chunk_size: int = 50,
    ) -> list[Icon]:
        """
        Optimized batch fetching with concurrent requests.
        
        Args:
            icons: List of icon request dictionaries
            chunk_size: Number of icons per batch request
            
        Returns:
            List of Icon objects
        """
        if not icons:
            return []
        
        # Split into chunks
        chunks = [
            icons[i:i + chunk_size] 
            for i in range(0, len(icons), chunk_size)
        ]
        
        # Process chunks concurrently
        results = await asyncio.gather(
            *[self.get_batch(chunk) for chunk in chunks],
            return_exceptions=True
        )
        
        # Merge results
        all_icons: list[Icon] = []
        for result in results:
            if isinstance(result, Exception):
                raise result
            for item in result.data:
                if hasattr(item, 'svg'):
                    all_icons.append(item)
                    
        return all_icons
