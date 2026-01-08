"""
SVG API Python SDK

A production-ready Python client for the SVG API.
Access 50,000+ icons from 20+ open-source icon libraries.

Example:
    >>> from svg_api import SvgApi
    >>> client = SvgApi(api_key="sk_live_xxx")  # optional
    >>> icon = client.get_icon("home", source="heroicons", size=32)
    >>> print(icon.svg)
"""

from svg_api.client import SvgApi, AsyncSvgApi
from svg_api.errors import (
    SvgApiError,
    ApiError,
    AuthenticationError,
    RateLimitError,
    InvalidRequestError,
    NotFoundError,
    ServiceUnavailableError,
)
from svg_api.types import (
    Icon,
    Source,
    Category,
    SearchResult,
    IconOptions,
    SearchOptions,
    BatchIconRequest,
    RandomIconOptions,
    License,
    ApiResponse,
    SearchResponse,
    BatchResponse,
    SourcesResponse,
    CategoriesResponse,
)

__version__ = "1.0.0"
__all__ = [
    # Clients
    "SvgApi",
    "AsyncSvgApi",
    # Exceptions
    "SvgApiError",
    "ApiError",
    "AuthenticationError",
    "RateLimitError",
    "InvalidRequestError",
    "NotFoundError",
    "ServiceUnavailableError",
    # Types
    "Icon",
    "Source",
    "Category",
    "SearchResult",
    "IconOptions",
    "SearchOptions",
    "BatchIconRequest",
    "RandomIconOptions",
    "License",
    "ApiResponse",
    "SearchResponse",
    "BatchResponse",
    "SourcesResponse",
    "CategoriesResponse",
]
