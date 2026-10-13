import logging

from fastapi import APIRouter,HTTPException, logger
from pydantic import BaseModel,Field

from app.schemas.resume import ResumeParseResult
from app.services.resume_generator import generate_resume

logger = logging.getLogger(__name__)

router=APIRouter()

class GenerateResumeRequest(BaseModel):
    candidate_resume:ResumeParseResult
    job_description:str =Field(
        ...,
        min_length=20,
        description="Full text of the target job description",
    )
    target_job_title:str=Field(
        default="",
        description="Target position,For example- AI Engineer",
    )
    target_company:str=Field(
        default="",
        description="Target company name(optional)",
    )

@router.post(
    "/generate-resume", 
    response_model=ResumeParseResult,
 )
async def generate_resume_endpoint(
    request:GenerateResumeRequest,
):
    """Generate a job-tailored resume from candidate data and a job description."""
    try:
        generated_data=await generate_resume(
            candidate_resume=request.candidate_resume.model_dump(),
            job_description=request.job_description,
            target_job_title=request.target_job_title,
            target_company=request.target_company,
        )

        # validate ai response against resume scheama
        validated_resume=ResumeParseResult.model_validate(
            generated_data
        )

        return validated_resume
    
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

    except Exception as exc:
        logger.exception("Resume generation failed")
        raise HTTPException(
            status_code=500,
            detail="Resume generation failed. Check the AI service logs.",
        ) from exc


    