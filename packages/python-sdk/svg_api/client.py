"""
Main client classes for the SVG API SDK.

Provides both synchronous and asynchronous clients for accessing the SVG API.
"""

from __future__ import annotations

import pathlib
from typing import TYPE_CHECKING, Any, Literal

import httpx

from svg_api.errors import (
    ApiError,
    NetworkError,
    NotFoundError,
    raise_for_status,
    TimeoutError,
)
from svg_api.types import (
    BatchIconRequest,
    BatchIconResult,
    BatchRequestOptions,
    BatchResponse,
    CategoriesResponse,
    Category,
    Icon,
    IconOptions,
    IconResponse,
    RandomIconOptions,
    SearchOptions,
    SearchResponse,
    SearchResult,
    Source,
    SourcesResponse,
)
from svg_api.utils import (
    async_retry_with_backoff,
    build_query_params,
    retry_with_backoff,
    validate_color,
    validate_size,
    validate_stroke,
)

if TYPE_CHECKING:
    from collections.abc import Iterator


DEFAULT_BASE_URL = "https://api.svg-api.org/v1"
DEFAULT_TIMEOUT = 30.0
USER_AGENT = "svg-api-python/1.0.0"


class SvgApiConfig:
    """
    Configuration for the SVG API client.

    Attributes:
        base_url: API base URL
        api_key: Optional API key for authentication
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        retry_delay: Base delay for retry exponential backoff
    """

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        retry_delay: float = 0.5,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay


class _SvgApiBase:
    """
    Base class for SVG API clients containing shared logic.
    """

    def __init__(
        self,
        config: SvgApiConfig,
        client: httpx.Client | httpx.AsyncClient,
    ) -> None:
        self._config = config
        self._client = client

    def _build_headers(self) -> dict[str, str]:
        """Build request headers."""
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }
        if self._config.api_key:
            headers["Authorization"] = f"Bearer {self._config.api_key}"
        return headers

    def _build_url(self, path: str) -> str:
        """Build full URL for API endpoint."""
        return f"{self._config.base_url}{path}"

    def _get_request_id(self, response: httpx.Response) -> str | None:
        """Extract request ID from response headers."""
        return response.headers.get("X-Request-Id")

    def _parse_rate_limit_info(self, response: httpx.Response) -> dict[str, int | str]:
        """Parse rate limit info from response headers."""
        return {
            "limit": response.headers.get("X-RateLimit-Limit", ""),
            "remaining": response.headers.get("X-RateLimit-Remaining", ""),
            "reset": response.headers.get("X-RateLimit-Reset", ""),
            "policy": response.headers.get("X-RateLimit-Policy", ""),
        }


class SvgApi(_SvgApiBase):
    """
    Synchronous client for the SVG API.

    Example:
        >>> client = SvgApi(api_key="sk_live_xxx")  # optional
        >>> icon = client.get_icon("home", source="heroicons", size=32)
        >>> print(icon.svg)

    Example with context manager:
        >>> with SvgApi() as client:
        ...     icon = client.get_icon("home", source="heroicons")
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        config: SvgApiConfig | None = None,
    ) -> None:
        """
        Initialize the SVG API client.

        Args:
            api_key: Optional API key for higher rate limits
            base_url: API base URL (default: https://api.svg-api.org/v1)
            timeout: Request timeout in seconds (default: 30)
            max_retries: Maximum retry attempts for transient errors (default: 3)
            retry_delay: Base delay for exponential backoff (default: 0.5)
            config: Optional SvgApiConfig object (overrides other params)
        """
        if config is None:
            config = SvgApiConfig(
                base_url=base_url,
                api_key=api_key,
                timeout=timeout,
                max_retries=max_retries,
                retry_delay=retry_delay,
            )

        self._client = httpx.Client(
            base_url=config.base_url,
            timeout=config.timeout,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )
        if config.api_key:
            self._client.headers["Authorization"] = f"Bearer {config.api_key}"

        super().__init__(config, self._client)

    def __enter__(self) -> SvgApi:
        """Support context manager protocol."""
        return self

    def __exit__(self, *args: Any) -> None:
        """Close the HTTP client on exit."""
        self.close()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Make an HTTP request with retry logic.

        Args:
            method: HTTP method
            path: API endpoint path
            params: Query parameters
            json: Request body JSON
            headers: Additional headers

        Returns:
            Parsed JSON response

        Raises:
            SvgApiError: On API errors
        """
        url = self._build_url(path)
        request_headers = self._build_headers()
        if headers:
            request_headers.update(headers)

        def _make_request() -> dict[str, Any]:
            response = self._client.request(
                method=method,
                url=url,
                params=params,
                json=json,
                headers=request_headers,
            )
            return self._handle_response(response)

        if self._config.max_retries > 0:
            return retry_with_backoff(
                _make_request,
                max_attempts=self._config.max_retries + 1,
                base_delay=self._config.retry_delay,
            )
        return _make_request()

    def _handle_response(self, response: httpx.Response) -> dict[str, Any]:
        """
        Handle API response, raising appropriate exceptions.

        Args:
            response: HTTP response

        Returns:
            Parsed JSON response

        Raises:
            SvgApiError: On API errors
        """
        try:
            data = response.json()
        except Exception:
            data = {}

        request_id = self._get_request_id(response)

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise raise_for_status(e.response.status_code, data, request_id)
        except httpx.TimeoutException as e:
            raise TimeoutError(
                message="Request timed out",
                timeout=self._config.timeout,
                request_id=request_id,
            ) from e
        except httpx.NetworkError as e:
            raise NetworkError(
                message=f"Network error: {e}",
                request_id=request_id,
            ) from e

        return data

    def get_icon(
        self,
        name: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> Icon:
        """
        Get a single icon by name.

        Args:
            name: Icon name (e.g., "home", "arrow-right")
            source: Icon source (default: "heroicons")
            size: Icon size in pixels (8-512, default: 24)
            stroke: Stroke width (0.5-3, default: 2)
            color: Icon color as hex or name

        Returns:
            Icon object with SVG content and metadata

        Raises:
            InvalidRequestError: For invalid parameters
            NotFoundError: If icon not found

        Example:
            >>> icon = client.get_icon("home", source="heroicons", size=32)
            >>> print(icon.svg)
        """
        # Validate parameters
        if size is not None and not validate_size(size):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Size must be between 8 and 512",
                code="INVALID_SIZE",
                details={"provided": size, "min": 8, "max": 512},
            )
        if stroke is not None and not validate_stroke(stroke):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Stroke width must be between 0.5 and 3",
                code="INVALID_STROKE",
                details={"provided": stroke, "min": 0.5, "max": 3},
            )
        if color is not None and not validate_color(color):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Invalid color format. Use hex (#rrggbb) or named color",
                code="INVALID_COLOR",
                details={"provided": color},
            )

        params = build_query_params({"source": source, "size": size, "stroke": stroke, "color": color})
        data = self._request("GET", f"/icons/{name}", params=params)
        return IconResponse(**data).data

    def get_icon_svg(
        self,
        name: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> str:
        """
        Get raw SVG content for an icon.

        Args:
            name: Icon name
            source: Icon source (default: "heroicons")
            size: Icon size in pixels
            stroke: Stroke width
            color: Icon color

        Returns:
            Raw SVG string

        Example:
            >>> svg = client.get_icon_svg("home", source="heroicons")
            >>> print(svg)
        """
        icon = self.get_icon(name, source, size, stroke, color)
        return icon.svg

    def download_icon(
        self,
        name: str,
        path: str | pathlib.Path,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> str:
        """
        Download an icon to a file.

        Args:
            name: Icon name
            path: Destination file path
            source: Icon source (default: "heroicons")
            size: Icon size in pixels
            stroke: Stroke width
            color: Icon color

        Returns:
            Absolute path to the saved file

        Example:
            >>> path = client.download_icon("home", "home.svg", source="heroicons")
            >>> print(f"Saved to {path}")
        """
        svg = self.get_icon_svg(name, source, size, stroke, color)
        path_obj = pathlib.Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        path_obj.write_text(svg, encoding="utf-8")
        return str(path_obj.absolute())

    def search(
        self,
        query: str,
        source: str | None = None,
        category: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResponse:
        """
        Search for icons.

        Args:
            query: Search query (min 2 characters)
            source: Filter by icon source
            category: Filter by category
            limit: Results per page (1-100, default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            SearchResponse with results and metadata

        Example:
            >>> results = client.search("arrow", source="lucide", limit=10)
            >>> for result in results.data:
            ...     print(f"{result.name}: {result.score}")
        """
        params = build_query_params({
            "q": query,
            "source": source,
            "category": category,
            "limit": min(limit, 100),
            "offset": offset,
        })
        data = self._request("GET", "/search", params=params)
        return SearchResponse(**data)

    def get_batch(
        self,
        icons: list[dict[str, Any]],
        defaults: dict[str, Any] | None = None,
    ) -> BatchResponse:
        """
        Fetch multiple icons in a single request.

        Args:
            icons: List of icon requests, each containing at least 'name'
            defaults: Default values for size, stroke, color

        Returns:
            BatchResponse with results and any errors

        Example:
            >>> result = client.get_batch([
            ...     {"name": "home", "source": "heroicons"},
            ...     {"name": "search", "source": "lucide"},
            ... ])
            >>> for key, icon in result.data.items():
            ...     if icon.success:
            ...         print(f"{key}: OK")
        """
        # Convert dicts to BatchIconRequest
        icon_requests = [BatchIconRequest(**icon) for icon in icons]
        defaults_obj = (
            BatchIconRequest(**defaults) if defaults else BatchIconRequest(name="")
        )
        batch_request = BatchRequestOptions(
            icons=icon_requests,
            defaults=BatchIconRequest(
                name="",
                size=defaults_obj.size or 24,
                stroke=defaults_obj.stroke or 2,
            ),
        )

        data = self._request(
            "POST",
            "/icons/batch",
            json=batch_request.model_dump(by_alias=True, exclude_none=True),
        )
        return BatchResponse(**data)

    def get_sources(self) -> SourcesResponse:
        """
        List all available icon sources.

        Returns:
            SourcesResponse with list of sources

        Example:
            >>> sources = client.get_sources()
            >>> for source in sources.data:
            ...     print(f"{source.name}: {source.icon_count} icons")
        """
        data = self._request("GET", "/sources")
        return SourcesResponse(**data)

    def get_categories(self, source: str | None = None) -> CategoriesResponse:
        """
        List all icon categories.

        Args:
            source: Optional filter by source

        Returns:
            CategoriesResponse with list of categories

        Example:
            >>> categories = client.get_categories(source="heroicons")
            >>> for cat in categories.data:
            ...     print(f"{cat.name}: {cat.icon_count} icons")
        """
        params = build_query_params({"source": source})
        data = self._request("GET", "/categories", params=params)
        return CategoriesResponse(**data)

    def get_random(
        self,
        source: str | None = None,
        category: str | None = None,
    ) -> Icon:
        """
        Get a random icon.

        Args:
            source: Optional filter by source
            category: Optional filter by category

        Returns:
            Random Icon object

        Example:
            >>> icon = client.get_random(category="navigation")
            >>> print(f"Random: {icon.name} from {icon.source}")
        """
        params = build_query_params({"source": source, "category": category})
        data = self._request("GET", "/random", params=params)
        return IconResponse(**data).data


class AsyncSvgApi(_SvgApiBase):
    """
    Asynchronous client for the SVG API.

    Example:
        >>> client = AsyncSvgApi(api_key="sk_live_xxx")  # optional
        >>> icon = await client.get_icon("home", source="heroicons", size=32)
        >>> print(icon.svg)

    Example with context manager:
        >>> async with AsyncSvgApi() as client:
        ...     icon = await client.get_icon("home", source="heroicons")
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        config: SvgApiConfig | None = None,
    ) -> None:
        """
        Initialize the async SVG API client.

        Args:
            api_key: Optional API key for higher rate limits
            base_url: API base URL
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Base delay for exponential backoff
            config: Optional SvgApiConfig object
        """
        if config is None:
            config = SvgApiConfig(
                base_url=base_url,
                api_key=api_key,
                timeout=timeout,
                max_retries=max_retries,
                retry_delay=retry_delay,
            )

        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )
        if config.api_key:
            self._client.headers["Authorization"] = f"Bearer {config.api_key}"

        super().__init__(config, self._client)

    async def __aenter__(self) -> AsyncSvgApi:
        """Support async context manager protocol."""
        return self

    async def __aexit__(self, *args: Any) -> None:
        """Close the HTTP client on exit."""
        await self.close()

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """
        Make an async HTTP request with retry logic.

        Args:
            method: HTTP method
            path: API endpoint path
            params: Query parameters
            json: Request body JSON
            headers: Additional headers

        Returns:
            Parsed JSON response

        Raises:
            SvgApiError: On API errors
        """
        url = self._build_url(path)
        request_headers = self._build_headers()
        if headers:
            request_headers.update(headers)

        async def _make_request() -> dict[str, Any]:
            response = await self._client.request(
                method=method,
                url=url,
                params=params,
                json=json,
                headers=request_headers,
            )
            return await self._handle_response(response)

        if self._config.max_retries > 0:
            return await async_retry_with_backoff(
                _make_request,
                max_attempts=self._config.max_retries + 1,
                base_delay=self._config.retry_delay,
            )
        return await _make_request()

    async def _handle_response(self, response: httpx.Response) -> dict[str, Any]:
        """
        Handle API response asynchronously.

        Args:
            response: HTTP response

        Returns:
            Parsed JSON response

        Raises:
            SvgApiError: On API errors
        """
        try:
            data = response.json()
        except Exception:
            data = {}

        request_id = self._get_request_id(response)

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise raise_for_status(e.response.status_code, data, request_id)
        except httpx.TimeoutException as e:
            raise TimeoutError(
                message="Request timed out",
                timeout=self._config.timeout,
                request_id=request_id,
            ) from e
        except httpx.NetworkError as e:
            raise NetworkError(
                message=f"Network error: {e}",
                request_id=request_id,
            ) from e

        return data

    async def get_icon(
        self,
        name: str,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> Icon:
        """
        Get a single icon by name (async).

        Args:
            name: Icon name
            source: Icon source (default: "heroicons")
            size: Icon size in pixels (8-512)
            stroke: Stroke width (0.5-3)
            color: Icon color as hex or name

        Returns:
            Icon object with SVG content

        Example:
            >>> icon = await client.get_icon("home", source="heroicons", size=32)
        """
        if size is not None and not validate_size(size):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Size must be between 8 and 512",
                code="INVALID_SIZE",
                details={"provided": size, "min": 8, "max": 512},
            )
        if stroke is not None and not validate_stroke(stroke):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Stroke width must be between 0.5 and 3",
                code="INVALID_STROKE",
                details={"provided": stroke, "min": 0.5, "max": 3},
            )
        if color is not None and not validate_color(color):
            from svg_api.errors import InvalidRequestError

            raise InvalidRequestError(
                message="Invalid color format. Use hex (#rrggbb) or named color",
                code="INVALID_COLOR",
                details={"provided": color},
            )

        params = build_query_params({"source": source, "size": size, "stroke": stroke, "color": color})
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
        path: str | pathlib.Path,
        source: str = "heroicons",
        size: int | None = None,
        stroke: float | None = None,
        color: str | None = None,
    ) -> str:
        """Download an icon to a file (async)."""
        import aiofiles

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
        defaults_obj = (
            BatchIconRequest(**defaults) if defaults else BatchIconRequest(name="")
        )
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
