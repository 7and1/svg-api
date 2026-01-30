"""
SVG API Python SDK

A production-ready Python SDK for the SVG API.
Provides both synchronous and asynchronous clients.

Example:
    # Synchronous usage
    from svg_api import SvgApi
    
    client = SvgApi()
    icon = client.get_icon("home", source="heroicons")
    print(icon.svg)
    
    # Asynchronous usage
    from svg_api import AsyncSvgApi
    
    async with AsyncSvgApi() as client:
        icon = await client.get_icon("home", source="heroicons")
        print(icon.svg)
"""

from svg_api.client import SvgApi, SvgApiConfig
from svg_api.async_client import AsyncSvgApi, AsyncSvgApiConfig
from svg_api.types import (
    Icon,
    IconLicense,
    Source,
    Category,
    SearchResult,
    BatchIconResult,
    BatchResponse,
    SearchResponse,
    SourcesResponse,
    CategoriesResponse,
    IconResponse,
)
from svg_api.errors import (
    SvgApiError,
    NotFoundError,
    InvalidRequestError,
    RateLimitError,
    ServerError,
    NetworkError,
    TimeoutError,
    AuthenticationError,
)

__version__ = "1.0.0"
__all__ = [
    # Clients
    "SvgApi",
    "SvgApiConfig",
    "AsyncSvgApi",
    "AsyncSvgApiConfig",
    # Types
    "Icon",
    "IconLicense",
    "Source",
    "Category",
    "SearchResult",
    "BatchIconResult",
    "BatchResponse",
    "SearchResponse",
    "SourcesResponse",
    "CategoriesResponse",
    "IconResponse",
    # Errors
    "SvgApiError",
    "NotFoundError",
    "InvalidRequestError",
    "RateLimitError",
    "ServerError",
    "NetworkError",
    "TimeoutError",
    "AuthenticationError",
]
