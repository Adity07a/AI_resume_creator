
import httpx
from django.conf import settings


class AIServiceError(Exception):
    """Raised when the FastAPI AI service cannot process a request."""


def call_ai_service(
    endpoint: str,
    payload: dict,
    timeout: float = 180.0,
) -> dict:
    base_url = settings.AI_SERVICE_URL.rstrip("/")
    endpoint = endpoint.lstrip("/")

    try:
        response = httpx.post(
            f"{base_url}/{endpoint}",
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        result = response.json()

    except httpx.HTTPStatusError as exc:
        raise AIServiceError(
            f"AI service returned HTTP {exc.response.status_code}: "
            f"{exc.response.text[:500]}"
        ) from exc

    except httpx.RequestError as exc:
        raise AIServiceError(
            "Could not connect to the AI service. "
            "Check that FastAPI is running on port 8001."
        ) from exc

    except ValueError as exc:
        raise AIServiceError(
            "AI service returned an invalid JSON response."
        ) from exc

    if not isinstance(result, dict):
        raise AIServiceError(
            "AI service response must be a JSON object."
        )

    return result
