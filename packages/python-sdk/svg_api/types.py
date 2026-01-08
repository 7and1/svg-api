"""
Type definitions for the SVG API SDK.

Uses Pydantic for runtime validation and serialization.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator


class License(BaseModel):
    """
    License information for an icon source.

    Attributes:
        type: License type (e.g., "MIT", "ISC", "Apache-2.0")
        url: URL to the full license text
    """

    type: str = Field(..., description="License type")
    url: HttpUrl = Field(..., description="URL to the license text")


class Source(BaseModel):
    """
    Metadata for an icon source/library.

    Attributes:
        id: Unique identifier for the source (e.g., "heroicons")
        name: Human-readable name (e.g., "Heroicons")
        description: Description of the icon library
        version: Version of the icon library
        icon_count: Number of icons in the source
        website: Official website URL
        repository: Source code repository URL
        license: License information
        variants: Available icon variants
        default_variant: Default icon variant
        categories: List of categories available in this source
    """

    id: str = Field(..., description="Source identifier")
    name: str = Field(..., description="Source name")
    description: str = Field(default="", description="Source description")
    version: str = Field(default="unknown", description="Source version")
    icon_count: int = Field(..., ge=0, description="Number of icons")
    website: HttpUrl | None = Field(None, description="Official website")
    repository: HttpUrl | None = Field(None, description="Repository URL")
    license: License = Field(..., description="License information")
    variants: list[str] = Field(default_factory=list, description="Available variants")
    default_variant: str = Field(default="default", description="Default variant")
    categories: list[str] = Field(default_factory=list, description="Available categories")


class Category(BaseModel):
    """
    Metadata for an icon category.

    Attributes:
        id: Unique identifier for the category (e.g., "navigation")
        name: Human-readable name (e.g., "Navigation")
        description: Description of the category
        icon_count: Number of icons in this category
        sources: List of sources that have icons in this category
    """

    id: str = Field(..., description="Category identifier")
    name: str = Field(..., description="Category name")
    description: str = Field(default="", description="Category description")
    icon_count: int = Field(..., ge=0, description="Number of icons")
    sources: list[str] = Field(default_factory=list, description="Sources with this category")


class Icon(BaseModel):
    """
    Icon data with SVG content and metadata.

    Attributes:
        name: Icon name (e.g., "home", "arrow-right")
        source: Icon source/library (e.g., "heroicons")
        category: Icon category
        tags: List of searchable tags
        svg: Raw SVG content
        variants: Available icon variants
        license: License information
    """

    name: str = Field(..., description="Icon name")
    source: str = Field(..., description="Icon source")
    category: str | None = Field(None, description="Icon category")
    tags: list[str] = Field(default_factory=list, description="Searchable tags")
    svg: str = Field(..., description="SVG content")
    variants: list[str] = Field(default_factory=list, description="Available variants")
    license: License | None = Field(None, description="License information")

    def __str__(self) -> str:
        return f"{self.source}:{self.name}"


class SearchResult(BaseModel):
    """
    A single search result.

    Attributes:
        name: Icon name
        source: Icon source
        category: Icon category
        score: Relevance score (0-1)
        preview_url: URL to preview the icon
        matches: Information about which fields matched
    """

    name: str = Field(..., description="Icon name")
    source: str = Field(..., description="Icon source")
    category: str | None = Field(None, description="Icon category")
    score: float = Field(..., ge=0, le=1, description="Relevance score")
    preview_url: HttpUrl | None = Field(None, description="Preview URL")
    matches: dict[str, Any] = Field(default_factory=dict, description="Match information")

    def __str__(self) -> str:
        return f"{self.source}:{self.name} ({self.score:.2f})"


class Meta(BaseModel):
    """
    Response metadata.

    Attributes:
        request_id: Unique request identifier
        timestamp: Response timestamp
        cached: Whether the response was cached
        cache_age: Age of cache in seconds
    """

    request_id: str | None = Field(None, description="Request ID")
    timestamp: str | None = Field(None, description="Response timestamp")
    cached: bool | None = Field(None, description="Was response cached")
    cache_age: int | None = Field(None, description="Cache age in seconds")


class PaginationMeta(Meta):
    """
    Pagination metadata.

    Attributes:
        total: Total number of results
        limit: Results per page
        offset: Pagination offset
        has_more: Whether more results are available
    """

    total: int | None = Field(None, description="Total results")
    limit: int | None = Field(None, description="Results per page")
    offset: int | None = Field(None, description="Pagination offset")
    has_more: bool | None = Field(None, description="More results available")


class SearchMeta(PaginationMeta):
    """
    Search-specific metadata.

    Attributes:
        query: Search query string
        search_time_ms: Search time in milliseconds
    """

    query: str | None = Field(None, description="Search query")
    search_time_ms: int | None = Field(None, description="Search time (ms)")


class ApiResponse(BaseModel):
    """
    Base API response wrapper.

    Attributes:
        data: Response data
        meta: Response metadata
    """

    meta: Meta = Field(default_factory=Meta, description="Response metadata")


class IconResponse(ApiResponse):
    """
    Response for single icon requests.

    Attributes:
        data: Icon data
    """

    data: Icon = Field(..., description="Icon data")


class SearchResponse(ApiResponse):
    """
    Response for search requests.

    Attributes:
        data: List of search results
        meta: Search metadata including pagination
    """

    data: list[SearchResult] = Field(default_factory=list, description="Search results")
    meta: SearchMeta = Field(default_factory=SearchMeta, description="Search metadata")

    def __iter__(self):
        return iter(self.data)

    def __len__(self) -> int:
        return len(self.data)


class BatchIconResult(BaseModel):
    """
    Result for a single icon in a batch request.

    Attributes:
        success: Whether the icon was fetched successfully
        name: Icon name
        source: Icon source
        svg: SVG content (if successful)
        category: Icon category
    """

    success: bool = Field(..., description="Was the request successful")
    name: str | None = Field(None, description="Icon name")
    source: str | None = Field(None, description="Icon source")
    svg: str | None = Field(None, description="SVG content")
    category: str | None = Field(None, description="Icon category")


class BatchError(BaseModel):
    """
    Error information for a failed batch item.

    Attributes:
        code: Error code
        message: Error message
    """

    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")


class BatchMeta(Meta):
    """
    Batch response metadata.

    Attributes:
        requested: Number of icons requested
        successful: Number of successful fetches
        failed: Number of failed fetches
    """

    requested: int = Field(..., description="Icons requested")
    successful: int = Field(..., ge=0, description="Successful fetches")
    failed: int = Field(..., ge=0, description="Failed fetches")


class BatchResponse(BaseModel):
    """
    Response for batch icon requests.

    Attributes:
        data: Dictionary of batch results keyed by "source:name"
        errors: Dictionary of errors keyed by "source:name"
        meta: Batch metadata
    """

    data: dict[str, BatchIconResult] = Field(
        default_factory=dict, description="Batch results"
    )
    errors: dict[str, BatchError] = Field(default_factory=dict, description="Batch errors")
    meta: BatchMeta = Field(..., description="Batch metadata")

    def __iter__(self):
        return iter(self.data.items())

    def __len__(self) -> int:
        return len(self.data)


class SourcesResponse(ApiResponse):
    """
    Response for sources list requests.

    Attributes:
        data: List of icon sources
        meta: Metadata including total counts
    """

    data: list[Source] = Field(default_factory=list, description="Icon sources")
    meta: Meta = Field(..., description="Response metadata")

    def __iter__(self):
        return iter(self.data)

    def __len__(self) -> int:
        return len(self.data)


class CategoriesResponse(ApiResponse):
    """
    Response for categories list requests.

    Attributes:
        data: List of categories
        meta: Metadata including total count
    """

    data: list[Category] = Field(default_factory=list, description="Categories")
    meta: Meta = Field(..., description="Response metadata")

    def __iter__(self):
        return iter(self.data)

    def __len__(self) -> int:
        return len(self.data)


# Request models


class IconOptions(BaseModel):
    """
    Options for fetching an icon.

    Attributes:
        source: Icon source/library (default: "heroicons")
        size: Icon size in pixels (8-512, default: 24)
        stroke: Stroke width (0.5-3, default: 2)
        color: Icon color as hex or name
    """

    source: str = Field(default="heroicons", description="Icon source")
    size: int | None = Field(None, ge=8, le=512, description="Icon size in pixels")
    stroke: float | None = Field(None, ge=0.5, le=3, description="Stroke width")
    color: str | None = Field(None, description="Icon color (hex or name)")


class SearchOptions(BaseModel):
    """
    Options for searching icons.

    Attributes:
        source: Filter by icon source
        category: Filter by category
        limit: Results per page (1-100, default: 20)
        offset: Pagination offset (default: 0)
    """

    source: str | None = Field(None, description="Filter by source")
    category: str | None = Field(None, description="Filter by category")
    limit: int | None = Field(None, ge=1, le=100, description="Results per page")
    offset: int | None = Field(None, ge=0, description="Pagination offset")


class BatchIconRequest(BaseModel):
    """
    Request for a single icon in a batch.

    Attributes:
        name: Icon name (required)
        source: Icon source (optional, defaults to batch default)
        size: Icon size (optional, defaults to batch default)
        stroke: Stroke width (optional, defaults to batch default)
        color: Icon color (optional, defaults to batch default)
    """

    name: str = Field(..., description="Icon name")
    source: str | None = Field(None, description="Icon source")
    size: int | None = Field(None, ge=8, le=512, description="Icon size")
    stroke: float | None = Field(None, ge=0.5, le=3, description="Stroke width")
    color: str | None = Field(None, description="Icon color")


class BatchDefaults(BaseModel):
    """
    Default values for batch request.

    Attributes:
        size: Default icon size (default: 24)
        stroke: Default stroke width (default: 2)
    """

    size: int = Field(default=24, ge=8, le=512, description="Default icon size")
    stroke: float = Field(default=2.0, ge=0.5, le=3, description="Default stroke width")


class BatchRequestOptions(BaseModel):
    """
    Options for batch icon request.

    Attributes:
        icons: List of icon requests (max 50)
        defaults: Default values for all icons
    """

    icons: list[BatchIconRequest] = Field(..., min_length=1, max_length=50, description="Icon requests")
    defaults: BatchDefaults = Field(
        default_factory=BatchDefaults, description="Default values"
    )

    @field_validator("icons")
    @classmethod
    def validate_icons(cls, v: list[BatchIconRequest]) -> list[BatchIconRequest]:
        """Validate that all icons have names."""
        for icon in v:
            if not icon.name:
                raise ValueError("Icon name is required")
        return v


class RandomIconOptions(BaseModel):
    """
    Options for getting a random icon.

    Attributes:
        source: Limit to specific source
        category: Limit to specific category
    """

    source: str | None = Field(None, description="Limit to source")
    category: str | None = Field(None, description="Limit to category")
