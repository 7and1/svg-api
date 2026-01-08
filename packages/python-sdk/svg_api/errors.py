"""
Exception classes for the SVG API SDK.

All exceptions inherit from SvgApiError for easy exception handling.
"""

from __future__ import annotations

from typing import Any


class SvgApiError(Exception):
    """
    Base exception for all SVG API errors.

    Example:
        >>> try:
        ...     client.get_icon("nonexistent")
        ... except SvgApiError as e:
        ...     print(f"Error: {e}")
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
        request_id: str | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        self.request_id = request_id
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"code={self.code!r}, "
            f"message={self.message!r}, "
            f"status_code={self.status_code!r}"
            f")"
        )


class ApiError(SvgApiError):
    """
    Generic API error for unexpected server responses (5xx status codes).

    Raised when the API returns an unexpected error.
    """

    pass


class AuthenticationError(SvgApiError):
    """
    Raised when authentication fails (401 status code).

    This typically indicates an invalid or missing API key.
    """

    pass


class RateLimitError(SvgApiError):
    """
    Raised when rate limit is exceeded (429 status code).

    Attributes:
        retry_after: Seconds to wait before retrying, if provided by the API.
    """

    def __init__(
        self,
        message: str,
        retry_after: int | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, code="RATE_LIMITED", status_code=429, **kwargs)
        self.retry_after = retry_after

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"code={self.code!r}, "
            f"message={self.message!r}, "
            f"retry_after={self.retry_after!r}"
            f")"
        )


class InvalidRequestError(SvgApiError):
    """
    Raised for invalid request parameters (400 status code).

    Common causes:
        - INVALID_PARAMETER: Invalid query parameter
        - INVALID_SIZE: Size must be between 8 and 512
        - INVALID_COLOR: Invalid color format
        - BATCH_LIMIT_EXCEEDED: Exceeded 50 icons per batch
    """

    pass


class NotFoundError(SvgApiError):
    """
    Raised when a resource is not found (404 status code).

    Common causes:
        - ICON_NOT_FOUND: Icon does not exist
        - SOURCE_NOT_FOUND: Icon source does not exist
        - CATEGORY_NOT_FOUND: Category does not exist
    """

    pass


class ServiceUnavailableError(SvgApiError):
    """
    Raised when the service is temporarily unavailable (503 status code).
    """

    pass


class TimeoutError(SvgApiError):
    """
    Raised when a request times out.
    """

    def __init__(
        self,
        message: str = "Request timed out",
        timeout: float | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)
        self.timeout = timeout

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"timeout={self.timeout!r}"
            f")"
        )


class NetworkError(SvgApiError):
    """
    Raised when a network error occurs during the request.
    """

    pass


def raise_for_status(
    status_code: int,
    data: dict[str, Any],
    request_id: str | None = None,
) -> None:
    """
    Raise an appropriate exception based on the status code.

    Args:
        status_code: HTTP status code
        data: Response data containing error information
        request_id: Request ID from response headers

    Raises:
        SvgApiError: Appropriate exception based on status code
    """
    error_info = data.get("error", {})
    message = error_info.get("message", "Unknown error")
    code = error_info.get("code")
    details = error_info.get("details")

    if status_code == 400:
        raise InvalidRequestError(
            message=message,
            code=code,
            status_code=status_code,
            details=details,
            request_id=request_id,
        )
    elif status_code == 401:
        raise AuthenticationError(
            message=message,
            code=code,
            status_code=status_code,
            details=details,
            request_id=request_id,
        )
    elif status_code == 404:
        raise NotFoundError(
            message=message,
            code=code,
            status_code=status_code,
            details=details,
            request_id=request_id,
        )
    elif status_code == 429:
        retry_after = details.get("retry_after") if details else None
        raise RateLimitError(
            message=message,
            retry_after=retry_after,
            status_code=status_code,
            details=details,
            request_id=request_id,
        )
    elif status_code >= 500:
        if status_code == 503:
            raise ServiceUnavailableError(
                message=message,
                code=code,
                status_code=status_code,
                details=details,
                request_id=request_id,
            )
        raise ApiError(
            message=message,
            code=code,
            status_code=status_code,
            details=details,
            request_id=request_id,
        )
