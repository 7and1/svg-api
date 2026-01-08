"""
Utility functions for the SVG API SDK.
"""

from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING, Any, Callable, TypeVar

if TYPE_CHECKING:
    from collections.abc import Awaitable, Coroutine

T = TypeVar("T")


def build_query_params(params: dict[str, Any]) -> dict[str, str | int | float]:
    """
    Build query parameters dict, removing None values.

    Args:
        params: Dictionary of parameters

    Returns:
        Dictionary with None values removed and other values converted
    """
    result = {}
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, bool):
            result[key] = str(value).lower()
        elif isinstance(value, (str, int, float)):
            result[key] = value
        elif isinstance(value, list):
            result[key] = ",".join(str(v) for v in value)
        else:
            result[key] = str(value)
    return result


def calculate_retry_delay(
    attempt: int,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
) -> float:
    """
    Calculate delay with exponential backoff.

    Args:
        attempt: Retry attempt number (0-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential calculation

    Returns:
        Delay in seconds
    """
    delay = min(base_delay * (exponential_base**attempt), max_delay)
    # Add jitter to prevent thundering herd
    jitter = delay * 0.1 * (time.time() % 1)
    return delay + jitter


async def async_retry_with_backoff(
    callable: Callable[[], Awaitable[T]],
    max_attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    retryable_errors: tuple[type[Exception], ...] | None = None,
) -> T:
    """
    Retry an async callable with exponential backoff.

    Args:
        callable: Async callable to retry
        max_attempts: Maximum number of attempts
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        retryable_errors: Tuple of error types that are retryable

    Returns:
        Result of the callable

    Raises:
        Exception: The last exception if all retries fail
    """
    from svg_api.errors import NetworkError, TimeoutError

    if retryable_errors is None:
        retryable_errors = (NetworkError, TimeoutError)

    last_exception = None

    for attempt in range(max_attempts):
        try:
            return await callable()
        except retryable_errors as e:
            last_exception = e
            if attempt == max_attempts - 1:
                break
            delay = calculate_retry_delay(attempt, base_delay, max_delay)
            await asyncio.sleep(delay)
        except Exception:
            # Don't retry non-retryable errors
            raise

    if last_exception:
        raise last_exception
    raise RuntimeError("Retry failed with unknown error")


def retry_with_backoff(
    callable: Callable[[], T],
    max_attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    retryable_errors: tuple[type[Exception], ...] | None = None,
) -> T:
    """
    Retry a callable with exponential backoff.

    Args:
        callable: Callable to retry
        max_attempts: Maximum number of attempts
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        retryable_errors: Tuple of error types that are retryable

    Returns:
        Result of the callable

    Raises:
        Exception: The last exception if all retries fail
    """
    from svg_api.errors import NetworkError, TimeoutError
    import time

    if retryable_errors is None:
        retryable_errors = (NetworkError, TimeoutError)

    last_exception = None

    for attempt in range(max_attempts):
        try:
            return callable()
        except retryable_errors as e:
            last_exception = e
            if attempt == max_attempts - 1:
                break
            delay = calculate_retry_delay(attempt, base_delay, max_delay)
            time.sleep(delay)
        except Exception:
            # Don't retry non-retryable errors
            raise

    if last_exception:
        raise last_exception
    raise RuntimeError("Retry failed with unknown error")


def validate_color(color: str) -> bool:
    """
    Validate a color value.

    Args:
        color: Color value to validate

    Returns:
        True if valid
    """
    import re

    # Check hex color
    if re.match(r"^#[0-9a-fA-F]{6}$", color):
        return True
    # Check named color (basic check)
    if re.match(r"^[a-z]+$", color):
        return True
    return False


def validate_size(size: int) -> bool:
    """
    Validate an icon size value.

    Args:
        size: Size value to validate

    Returns:
        True if valid
    """
    return 8 <= size <= 512


def validate_stroke(stroke: float) -> bool:
    """
    Validate a stroke width value.

    Args:
        stroke: Stroke width to validate

    Returns:
        True if valid
    """
    return 0.5 <= stroke <= 3.0
