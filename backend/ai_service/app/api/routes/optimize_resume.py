from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.resume_generator import optimize_resume

router = APIRouter()


class OptimizeResumeRequest(BaseModel):
    candidate_resume: dict = Field(
        ...,
        description="Candidate resume data in JSON format",
    )
    job_description: str = Field(
        ...,
        min_length=20,
        description="Target job description",
    )
    target_job_title: str = ""


class OptimizeResumeResponse(BaseModel):
    overall_match_score: int
    matched_keywords: list[str]
    missing_keywords: list[str]
    skill_gaps: list[str]
    suggestions: list[str]
    analysis_summary: str


@router.post(
    "/optimize-resume",
    response_model=OptimizeResumeResponse,
)
async def optimize_resume_endpoint(
    request: OptimizeResumeRequest,
):
    try:
        result = await optimize_resume(
            candidate_resume=request.candidate_resume,
            job_description=request.job_description,
            target_job_title=request.target_job_title,
        )
        return OptimizeResumeResponse(**result)

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