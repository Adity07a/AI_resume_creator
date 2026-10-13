
import json
import os

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.resume import ResumeParseResult
from app.services.resume_parser import (
    extract_resume_text,
    extract_contact_details,
    extract_document_links,
    extract_skills,
    extract_job_title,
    separate_education_and_certifications,
)

router = APIRouter()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434",
).rstrip("/")

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/parse-resume",
    response_model=ResumeParseResult,
)
async def parse_resume(file: UploadFile = File(...)):
    if LLM_PROVIDER != "ollama":
        raise HTTPException(
            status_code=501,
            detail="Only the Ollama provider is configured currently.",
        )

    filename = file.filename or ""

    try:
        file_bytes = await file.read(MAX_UPLOAD_SIZE + 1)

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        if len(file_bytes) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail="File size exceeds the 10 MB limit.",
            )

        try:
            resume_text = extract_resume_text(filename, file_bytes)
            contact_details = extract_contact_details(resume_text)
            document_links = extract_document_links(filename, file_bytes)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

    finally:
        await file.close()

    
    prompt = f"""
Extract all available information from the supplied resume.

IMPORTANT RULES:
- Read the entire resume carefully, including the header and contact section.
- Extract the person's actual full name from the resume header.
- Extract every email address, phone number, and profile URL that is present.
- Populate skills with all explicitly listed technical and soft skills.
- Include every work experience entry and preserve its actual job title.
- Include project descriptions and their listed technologies.
- Separate formal education from courses, training, and certifications.
- Extract certifications, achievements, languages, and links when present.
- Do not leave a field empty if the information is clearly present.
- Do not invent or assume any information.
- If a detail is genuinely absent, use an empty string or empty list.
- A label such as "GitHub" or "LinkedIn" is not itself a URL.
- Return JSON matching the required schema.

RESUME TEXT:
<resume_text>
{resume_text}
</resume_text>
"""


    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You extract structured resume information. "
                    "Do not add facts that are not present in the supplied resume."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "format": ResumeParseResult.model_json_schema(),
        "stream": False,
        "options": {"temperature": 0},
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        content = response.json()["message"]["content"]
        result = ResumeParseResult.model_validate_json(content)

        result.education, result.certifications = (
            separate_education_and_certifications(
                result.education,
                result.certifications,
            )
        )
        
        if not result.skills:
            result.skills = extract_skills(resume_text)

        # Recover the job title if it is missing.
        for experience in result.experience:
            if not experience.job_title:
                title = extract_job_title(resume_text)

                if title:
                    experience.job_title = title


        # Merge contact details extracted directly from the resume text.
        for field in ("email", "phone", "linkedin", "github", "portfolio"):
            extracted_value = contact_details.get(field, "").strip()

            if extracted_value:
                setattr(result.personal_info, field, extracted_value)

        # Merge actual hyperlink destinations embedded in the document.
        for url in document_links:
            normalized_url = url.lower()

            if "linkedin.com/" in normalized_url:
                result.personal_info.linkedin = url
            elif "github.com/" in normalized_url:
                result.personal_info.github = url
            elif not result.personal_info.portfolio:
                result.personal_info.portfolio = url

        # Do not return display labels such as "Github" or "Linkedin"
        # as though they were actual URLs.
        if result.personal_info.github.lower() in ("github", "git hub"):
            result.personal_info.github = ""

        if result.personal_info.linkedin.lower() == "linkedin":
            result.personal_info.linkedin = ""

        return result
    
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Ensure Ollama is running.",
        ) from exc

    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Ollama took too long to process the resume.",
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama returned HTTP {exc.response.status_code}.",
        ) from exc

    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an invalid or unexpected response.",
        ) from exc
