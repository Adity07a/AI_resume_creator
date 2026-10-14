
import os

from dotenv import load_dotenv
from fastapi import FastAPI

from app.api.routes.parse_resume import (
    router as parse_resume_router,
)
from app.api.routes.parse_job import (
    router as parse_job_router,
)
from app.api.routes.generate_resume import (
    router as generate_resume_router,
)
from app.api.routes.improve_section import (
    router as improve_section_router,
)
from app.api.routes.generate_summary import (
    router as generate_summary_router,
)
from app.api.routes.optimize_resume import (
    router as optimize_resume_router,
)

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

app = FastAPI(
    title="AI Resume Creator - AI Service",
    description=(
        "AI and document-processing service for the AI Resume Creator."
    ),
    version="1.0.0",
)

app.include_router(
    parse_resume_router,
    prefix="/api/v1/ai",
    tags=["Resume Parsing"],
)

app.include_router(
    parse_job_router,
    prefix="/api/v1/ai",
    tags=["Job Description Parsing"],
)

app.include_router(
    generate_resume_router,
    prefix="/api/v1/ai",
    tags=["Resume Generation"],
)

app.include_router(
    improve_section_router,
    prefix="/api/v1/ai",
    tags=["Resume Editing"],
)

app.include_router(
    generate_summary_router,
    prefix="/api/v1/ai",
    tags=["Resume Generation"],
)

app.include_router(
    optimize_resume_router,
    prefix="/api/v1/ai",
    tags=["ATS Optimization"],
)


@app.get("/")
def root():
    return {
        "message": "AI Resume Creator AI Service is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "provider": LLM_PROVIDER,
        "model": (
            OLLAMA_MODEL if LLM_PROVIDER == "ollama" else None
        ),
    }
