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

    parsed_job: dict = Field(
        default_factory=dict,
        description="Previously parsed job requirements, if available",
    )


class OptimizeResumeResponse(BaseModel):
    # Existing response fields — retained.
    overall_match_score: int = 0
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    skill_gaps: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    analysis_summary: str = ""

    # Job requirements and their evidence in the resume.
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)

    matched_required_skills: list[str] = Field(default_factory=list)
    missing_required_skills: list[str] = Field(default_factory=list)

    matched_preferred_skills: list[str] = Field(default_factory=list)
    missing_preferred_skills: list[str] = Field(default_factory=list)

    weakly_represented_requirements: list[str] = Field(
        default_factory=list
    )

    unsupported_requirements: list[str] = Field(
        default_factory=list
    )

    experience_relevance: str = "unknown"

    # Calculated metrics.
    required_skill_matches: int = 0
    required_skill_total: int = 0

    preferred_skill_matches: int = 0
    preferred_skill_total: int = 0

    keyword_coverage_score: int = 0


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
            parsed_job=request.parsed_job,
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