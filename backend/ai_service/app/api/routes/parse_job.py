
import logging

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.schemas.job import JobParseRequest, JobParseResult
from app.services.job_parser import parse_job_description

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/parse-job", response_model=JobParseResult)
async def parse_job(
    request: JobParseRequest,
) -> JobParseResult:
    try:
        return await parse_job_description(request)

    except ValidationError as exc:
        logger.warning("AI returned invalid job parsing data: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI provider returned invalid job data. Please retry.",
        ) from exc

    except RuntimeError as exc:
        error_message = str(exc).lower()

        if any(
            keyword in error_message
            for keyword in (
                "timeout",
                "timed out",
                "took too long",
                "connect",
                "connection",
                "unavailable",
            )
        ):
            logger.warning("AI provider connection or timeout error: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="The AI provider is unavailable or timed out. Please retry.",
            ) from exc

        logger.exception("AI job parsing failed")
        raise HTTPException(
            status_code=502,
            detail="The AI provider could not parse this job description.",
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected error while parsing job description")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while parsing the job description.",
        ) from exc
