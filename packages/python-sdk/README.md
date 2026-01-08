# SVG API Python SDK

A production-ready Python client for the [SVG API](https://svg-api.org). Access 50,000+ icons from 20+ open-source icon libraries with a unified interface.

[![PyPI](https://img.shields.io/pypi/v/svg-api)](https://pypi.org/project/svg-api/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)

## Features

- Access 50,000+ icons from 20+ sources (Heroicons, Lucide, Feather, and more)
- Full-text search with relevance scoring
- Batch operations for efficiency
- Customizable icon properties (size, color, stroke width)
- Both synchronous and asynchronous clients
- Type hints with Pydantic validation
- Retry logic with exponential backoff
- Context manager support

## Installation

```bash
pip install svg-api
```

Or with Poetry:

```bash
poetry add svg-api
```

## Quickstart

### Synchronous Client

```python
from svg_api import SvgApi

# Initialize client (API key is optional but recommended for higher rate limits)
client = SvgApi(api_key="sk_live_xxxxxxxxxxxxx")

# Get a single icon
icon = client.get_icon("home", source="heroicons", size=32, color="#3b82f6")
print(icon.svg)

# Get raw SVG
svg = client.get_icon_svg("home", source="heroicons")

# Download icon to file
client.download_icon("home", "icons/home.svg", source="heroicons")

# Search icons
results = client.search("arrow", source="lucide", limit=10)
for result in results.data:
    print(f"{result.name}: {result.score}")

# Batch fetch multiple icons
batch = client.get_batch([
    {"name": "home", "source": "heroicons"},
    {"name": "search", "source": "lucide"},
    {"name": "user", "source": "feather"},
])
for key, icon in batch.data.items():
    if icon.success:
        print(f"{key}: OK")

# List available sources
sources = client.get_sources()
for source in sources.data:
    print(f"{source.name}: {source.icon_count} icons")

# Get categories
categories = client.get_categories(source="heroicons")

# Get random icon
random_icon = client.get_random(category="navigation")
print(f"Random: {random_icon.name} from {random_icon.source}")
```

### Asynchronous Client

```python
import asyncio
from svg_api import AsyncSvgApi

async def main():
    async with AsyncSvgApi(api_key="sk_live_xxxxxxxxxxxxx") as client:
        # Get a single icon
        icon = await client.get_icon("home", source="heroicons", size=32)
        print(icon.svg)

        # Search icons
        results = await client.search("arrow", limit=10)
        for result in results.data:
            print(f"{result.name}: {result.score}")

asyncio.run(main())
```

### Context Manager Usage

```python
# Synchronous
with SvgApi() as client:
    icon = client.get_icon("home", source="heroicons")

# Asynchronous
async with AsyncSvgApi() as client:
    icon = await client.get_icon("home", source="heroicons")
```

## API Reference

### Client Configuration

| Parameter     | Type          | Default                        | Description                             |
| ------------- | ------------- | ------------------------------ | --------------------------------------- |
| `api_key`     | `str \| None` | `None`                         | Optional API key for higher rate limits |
| `base_url`    | `str`         | `"https://api.svg-api.org/v1"` | API base URL                            |
| `timeout`     | `float`       | `30.0`                         | Request timeout in seconds              |
| `max_retries` | `int`         | `3`                            | Maximum retry attempts                  |
| `retry_delay` | `float`       | `0.5`                          | Base delay for exponential backoff      |

### Methods

#### `get_icon(name, source, size, stroke, color)`

Get a single icon by name.

- **name** (`str`): Icon name (required)
- **source** (`str`): Icon source (default: "heroicons")
- **size** (`int`): Icon size in pixels, 8-512 (default: 24)
- **stroke** (`float`): Stroke width, 0.5-3 (default: 2)
- **color** (`str`): Icon color as hex or name

Returns: `Icon` object

#### `get_icon_svg(name, source, size, stroke, color)`

Get raw SVG content for an icon.

Returns: `str` (SVG content)

#### `download_icon(name, path, source, size, stroke, color)`

Download an icon to a file.

- **path** (`str \| Path`): Destination file path

Returns: `str` (absolute path to saved file)

#### `search(query, source, category, limit, offset)`

Search for icons.

- **query** (`str`): Search query (min 2 characters)
- **source** (`str \| None`): Filter by source
- **category** (`str \| None`): Filter by category
- **limit** (`int`): Results per page, 1-100 (default: 20)
- **offset** (`int`): Pagination offset (default: 0)

Returns: `SearchResponse` object

#### `get_batch(icons, defaults)`

Fetch multiple icons in a single request (max 50).

- **icons** (`list[dict]`): List of icon requests
- **defaults** (`dict \| None`): Default values for all icons

Returns: `BatchResponse` object

#### `get_sources()`

List all available icon sources.

Returns: `SourcesResponse` object

#### `get_categories(source)`

List all icon categories.

- **source** (`str \| None`): Filter by source

Returns: `CategoriesResponse` object

#### `get_random(source, category)`

Get a random icon.

- **source** (`str \| None`): Filter by source
- **category** (`str \| None`): Filter by category

Returns: `Icon` object

## Type Definitions

### Icon

```python
class Icon:
    name: str              # Icon name
    source: str            # Icon source/library
    category: str | None   # Icon category
    tags: list[str]        # Searchable tags
    svg: str               # SVG content
    variants: list[str]    # Available variants
    license: License | None
```

### SearchResult

```python
class SearchResult:
    name: str              # Icon name
    source: str            # Icon source
    category: str | None   # Icon category
    score: float           # Relevance score (0-1)
    preview_url: HttpUrl | None
    matches: dict          # Match information
```

## Error Handling

```python
from svg_api import SvgApi
from svg_api.errors import (
    SvgApiError,
    InvalidRequestError,
    NotFoundError,
    RateLimitError,
)

client = SvgApi()

try:
    icon = client.get_icon("nonexistent", source="heroicons")
except InvalidRequestError as e:
    print(f"Invalid request: {e.message}")
    print(f"Details: {e.details}")
except NotFoundError as e:
    print(f"Not found: {e.message}")
    print(f"Suggestions: {e.details.get('suggestions')}")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except SvgApiError as e:
    print(f"API error: {e}")
```

## Available Icon Sources

- **heroicons** - Beautiful hand-crafted SVG icons by Tailwind CSS
- **lucide** - Beautiful & consistent icon toolkit
- **feather** - Simply beautiful open source icons
- **phosphor** - A flexible icon family for interfaces
- **tabler** - Over 4000 free MIT icons
- **bootstrap** - Official Bootstrap icons
- **fontawesome** - The internet's icon library
- And 13+ more sources

View all sources:

```python
client = SvgApi()
sources = client.get_sources()
for source in sources.data:
    print(f"{source.id}: {source.icon_count} icons")
```

## Rate Limits

| Tier       | Requests/min | Requests/day |
| ---------- | ------------ | ------------ |
| Anonymous  | 60           | 1,000        |
| Registered | 300          | 10,000       |
| Pro        | 1,000        | 100,000      |

Get an API key at [https://svg-api.org](https://svg-api.org) for higher limits.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: [https://docs.svg-api.org](https://docs.svg-api.org)
- Bug Tracker: [https://github.com/svg-api/python-sdk/issues](https://github.com/svg-api/python-sdk/issues)
- Email: support@svg-api.org
