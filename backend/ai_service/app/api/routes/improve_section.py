
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.resume_generator import improve_resume_section

router = APIRouter()


class ImproveSectionRequest(BaseModel):
    section_name: str = Field(..., min_length=1, max_length=100)
    section_content: str = Field(..., min_length=1, max_length=15000)
    job_description: str = Field(default="", max_length=20000)
    target_job_title: str = Field(default="", max_length=200)


class ImproveSectionResponse(BaseModel):
    section_name: str
    improved_content: str
    changes_summary: str = ""


@router.post(
    "/improve-section",
    response_model=ImproveSectionResponse,
)
async def improve_section_endpoint(request: ImproveSectionRequest):
    try:
        result = await improve_resume_section(
            section_name=request.section_name,
            section_content=request.section_content,
            job_description=request.job_description,
            target_job_title=request.target_job_title,
        )
        return ImproveSectionResponse(**result)

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
