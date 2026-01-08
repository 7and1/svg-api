"""
Asynchronous usage examples for the SVG API Python SDK.
"""

import asyncio
from svg_api import AsyncSvgApi


async def main():
    # Initialize client
    client = AsyncSvgApi()
    # Or with API key for higher rate limits:
    # client = AsyncSvgApi(api_key="sk_live_xxxxxxxxxxxxx")

    # Example 1: Get a single icon
    print("Example 1: Get a single icon")
    print("-" * 40)
    icon = await client.get_icon("home", source="heroicons", size=32)
    print(f"Icon: {icon.name} from {icon.source}")
    print(f"SVG: {icon.svg[:100]}...")
    print()

    # Example 2: Concurrent requests
    print("Example 2: Concurrent requests")
    print("-" * 40)
    tasks = [
        client.get_icon("home", source="heroicons"),
        client.get_icon("search", source="lucide"),
        client.get_icon("user", source="feather"),
    ]
    icons = await asyncio.gather(*tasks)
    for icon in icons:
        print(f"  - {icon.name} from {icon.source}")
    print()

    # Example 3: Async search
    print("Example 3: Async search")
    print("-" * 40)
    results = await client.search("arrow", limit=5)
    print(f"Found {len(results.data)} results")
    for result in results.data:
        print(f"  - {result.name}: score={result.score:.2f}")
    print()

    # Example 4: Async batch
    print("Example 4: Async batch")
    print("-" * 40)
    batch = await client.get_batch([
        {"name": "mail", "source": "heroicons"},
        {"name": "phone", "source": "lucide"},
        {"name": "settings", "source": "feather"},
    ])
    for key, icon in batch.data.items():
        if icon.success:
            print(f"  {key}: OK")
    print()

    # Example 5: Using async context manager
    print("Example 5: Using async context manager")
    print("-" * 40)
    async with AsyncSvgApi() as client:
        icon = await client.get_icon("star", source="heroicons")
        print(f"Got icon: {icon.name}")

    print("\nAll examples completed!")

    # Clean up
    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
