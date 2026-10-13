
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.resume_generator import generate_resume_summary


router = APIRouter()


class GenerateSummaryRequest(BaseModel):
    candidate_resume: dict = Field(
        ...,
        description="Parsed or edited candidate resume data",
    )
    target_job_title: str = Field(
        default="",
        description="Target role, for example AI Engineer",
    )
    job_description: str = Field(
        default="",
        description="Target job description (optional)",
    )


class GenerateSummaryResponse(BaseModel):
    summary: str


@router.post(
    "/generate-summary",
    response_model=GenerateSummaryResponse,
)
async def generate_summary_endpoint(
    request: GenerateSummaryRequest,
):
    """Generate a professional summary tailored to a target role."""

    try:
        result = await generate_resume_summary(
            candidate_resume=request.candidate_resume,
            target_job_title=request.target_job_title,
            job_description=request.job_description,
        )

        return GenerateSummaryResponse(**result)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
