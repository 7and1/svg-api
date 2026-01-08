"""
Error handling examples for the SVG API Python SDK.
"""

from svg_api import SvgApi
from svg_api.errors import (
    SvgApiError,
    InvalidRequestError,
    NotFoundError,
    RateLimitError,
    AuthenticationError,
)

client = SvgApi()

# Example 1: Handling not found errors
print("Example 1: Icon not found")
print("-" * 40)
try:
    icon = client.get_icon("this-icon-does-not-exist", source="heroicons")
except NotFoundError as e:
    print(f"Error: {e.code} - {e.message}")
    if e.details and "suggestions" in e.details:
        print(f"Did you mean: {', '.join(e.details['suggestions'])?}")
print()

# Example 2: Handling invalid parameters
print("Example 2: Invalid size parameter")
print("-" * 40)
try:
    icon = client.get_icon("home", source="heroicons", size=1000)
except InvalidRequestError as e:
    print(f"Error: {e.code} - {e.message}")
    if e.details:
        print(f"Details: {e.details}")
print()

# Example 3: Handling invalid color
print("Example 3: Invalid color format")
print("-" * 40)
try:
    icon = client.get_icon("home", source="heroicons", color="not-a-color")
except InvalidRequestError as e:
    print(f"Error: {e.code} - {e.message}")
print()

# Example 4: Generic error handling
print("Example 4: Generic error handling")
print("-" * 40)
try:
    icon = client.get_icon("home", source="nonexistent-source")
except SvgApiError as e:
    print(f"Caught SvgApiError: {e}")
    print(f"  Code: {e.code}")
    print(f"  Status: {e.status_code}")
    print(f"  Request ID: {e.request_id}")
print()

# Example 5: Batch error handling
print("Example 5: Batch request with errors")
print("-" * 40)
batch = client.get_batch([
    {"name": "home", "source": "heroicons"},
    {"name": "invalid-icon", "source": "heroicons"},
    {"name": "search", "source": "lucide"},
    {"name": "user", "source": "invalid-source"},
])
print(f"Requested: {batch.meta.requested}")
print(f"Successful: {batch.meta.successful}")
print(f"Failed: {batch.meta.failed}")

print("\nSuccessful:")
for key, result in batch.data.items():
    if result.success:
        print(f"  {key}: OK")

print("\nErrors:")
for key, error in batch.errors.items():
    print(f"  {key}: {error.code} - {error.message}")
print()

# Example 6: Context manager with error handling
print("Example 6: Context manager with error handling")
print("-" * 40)
try:
    with SvgApi() as client:
        icon = client.get_icon("home", source="heroicons")
        print(f"Got icon: {icon.name}")
except SvgApiError as e:
    print(f"Error occurred: {e}")

print("\nAll error handling examples completed!")
