import httpx
from django.conf import settings


class AIServiceError(Exception):
    """Raised when the FastAPI AI service cannot process a request."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code


def _internal_headers() -> dict[str, str]:
    token = settings.AI_SERVICE_SHARED_TOKEN

    if not token:
        raise AIServiceError(
            "AI service authentication is not configured.",
            status_code=503,
        )

    return {
        "X-Internal-Service-Token": token,
    }


def call_ai_service(
    endpoint: str,
    payload: dict,
    timeout: float = 180.0,
) -> dict:
    """Send an authenticated JSON request to FastAPI."""

    base_url = settings.AI_SERVICE_URL.rstrip("/")
    endpoint = endpoint.lstrip("/")

    try:
        response = httpx.post(
            f"{base_url}/{endpoint}",
            json=payload,
            headers=_internal_headers(),
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code

        # Return a generic error rather than exposing internal response data.
        safe_status = (
            status_code
            if 400 <= status_code < 500
            else 502
        )

        raise AIServiceError(
            f"AI service request failed (HTTP {status_code}).",
            status_code=safe_status,
        ) from exc

    except httpx.RequestError as exc:
        raise AIServiceError(
            "Could not connect to the AI service.",
            status_code=502,
        ) from exc

    except ValueError as exc:
        raise AIServiceError(
            "AI service returned invalid JSON.",
            status_code=502,
        ) from exc

    if not isinstance(result, dict):
        raise AIServiceError(
            "AI service returned an invalid response.",
            status_code=502,
        )

    return result


def call_ai_service_file(
    endpoint: str,
    file_name: str,
    file_content: bytes,
    content_type: str = "application/octet-stream",
    timeout: float = 180.0,
) -> dict:
    """Send an authenticated file upload to FastAPI."""

    base_url = settings.AI_SERVICE_URL.rstrip("/")
    endpoint = endpoint.lstrip("/")

    try:
        response = httpx.post(
            f"{base_url}/{endpoint}",
            files={
                "file": (
                    file_name,
                    file_content,
                    content_type,
                )
            },
            headers=_internal_headers(),
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        safe_status = (
            status_code
            if 400 <= status_code < 500
            else 502
        )

        raise AIServiceError(
            f"AI service file request failed (HTTP {status_code}).",
            status_code=safe_status,
        ) from exc

    except httpx.RequestError as exc:
        raise AIServiceError(
            "Could not connect to the AI service while processing the file.",
            status_code=502,
        ) from exc

    except ValueError as exc:
        raise AIServiceError(
            "AI service returned invalid JSON.",
            status_code=502,
        ) from exc

    if not isinstance(result, dict):
        raise AIServiceError(
            "AI service returned an invalid response.",
            status_code=502,
        )

    return result