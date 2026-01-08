"""
Basic usage examples for the SVG API Python SDK.
"""

from svg_api import SvgApi

# Initialize client
client = SvgApi()
# Or with API key for higher rate limits:
# client = SvgApi(api_key="sk_live_xxxxxxxxxxxxx")

# Example 1: Get a single icon
print("Example 1: Get a single icon")
print("-" * 40)
icon = client.get_icon("home", source="heroicons", size=32)
print(f"Icon: {icon.name} from {icon.source}")
print(f"SVG: {icon.svg[:100]}...")
print(f"Category: {icon.category}")
print(f"Tags: {', '.join(icon.tags)}")
print()

# Example 2: Get raw SVG
print("Example 2: Get raw SVG")
print("-" * 40)
svg = client.get_icon_svg("search", source="lucide")
print(f"Raw SVG: {svg[:100]}...")
print()

# Example 3: Search icons
print("Example 3: Search icons")
print("-" * 40)
results = client.search("arrow", source="heroicons", limit=5)
print(f"Found {len(results.data)} results (total: {results.meta.total})")
for result in results.data:
    print(f"  - {result.name} ({result.source}): score={result.score:.2f}")
print()

# Example 4: Batch fetch
print("Example 4: Batch fetch")
print("-" * 40)
batch = client.get_batch([
    {"name": "home", "source": "heroicons"},
    {"name": "search", "source": "lucide"},
    {"name": "user", "source": "feather"},
    {"name": "nonexistent", "source": "heroicons"},  # This will fail
])
print(f"Successful: {batch.meta.successful}")
print(f"Failed: {batch.meta.failed}")
for key, icon in batch.data.items():
    print(f"  {key}: {'OK' if icon.success else 'FAILED'}")
for key, error in batch.errors.items():
    print(f"  {key} ERROR: {error.message}")
print()

# Example 5: List sources
print("Example 5: List sources")
print("-" * 40)
sources = client.get_sources()
for source in sources.data[:3]:
    print(f"  - {source.name}: {source.icon_count} icons")
    print(f"    License: {source.license.type}")
print(f"  ... and {len(sources.data) - 3} more")
print()

# Example 6: List categories
print("Example 6: List categories")
print("-" * 40)
categories = client.get_categories(source="heroicons")
for category in categories.data[:5]:
    print(f"  - {category.name}: {category.icon_count} icons")
print()

# Example 7: Get random icon
print("Example 7: Get random icon")
print("-" * 40)
random_icon = client.get_random(category="navigation")
print(f"Random: {random_icon.name} from {random_icon.source}")
print(f"Category: {random_icon.category}")
print()

# Example 8: Using context manager
print("Example 8: Using context manager")
print("-" * 40)
with SvgApi() as client:
    icon = client.get_icon("heart", source="heroicons", color="#ff0000")
    print(f"Got icon: {icon.name}")

print("\nAll examples completed!")
