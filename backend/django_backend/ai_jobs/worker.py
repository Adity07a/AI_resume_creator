import logging
import os

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings",
)

import django

django.setup()

import httpx
from arq import Retry
from arq.connections import RedisSettings
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ai_jobs.models import AIJob
from resumes.models import Resume, ResumeVersion, ResumeSection


logger = logging.getLogger(__name__)


AI_ENDPOINTS = {
    AIJob.JobType.PARSE_JOB: "/api/v1/ai/parse-job",
    AIJob.JobType.GENERATE_RESUME: "/api/v1/ai/generate-resume",
    AIJob.JobType.GENERATE_SUMMARY: "/api/v1/ai/generate-summary",
    AIJob.JobType.IMPROVE_SECTION: "/api/v1/ai/improve-section",
    AIJob.JobType.OPTIMIZE_RESUME: "/api/v1/ai/optimize-resume",
}


def _duration_ms(job):
    if not job.started_at:
        return None

    elapsed = (
        timezone.now() - job.started_at
    ).total_seconds()

    return max(0, int(elapsed * 1000))


def _start_job(job_id, attempt):
    try:
        with transaction.atomic():
            job = AIJob.objects.select_for_update().get(pk=job_id)

            if job.status == AIJob.Status.COMPLETED:
                return {
                    "already_completed": True,
                    "output_payload": job.output_payload,
                }

            if job.status == AIJob.Status.FAILED:
                return {
                    "terminal": True,
                    "status": AIJob.Status.FAILED,
                }

            if job.status == AIJob.Status.PROCESSING:
                return {
                    "already_processing": True,
                    "status": AIJob.Status.PROCESSING,
                }

            effective_attempt = max(
                int(attempt),
                int(job.attempts) + 1,
            )

            job.status = AIJob.Status.PROCESSING
            job.attempts = effective_attempt
            job.error_message = ""
            job.started_at = timezone.now()
            job.completed_at = None

            job.save(
                update_fields=[
                    "status",
                    "attempts",
                    "error_message",
                    "started_at",
                    "completed_at",
                    "updated_at",
                ]
            )

            return {
                "already_completed": False,
                "attempt": effective_attempt,
                "job_type": job.job_type,
                "user_id": job.user_id,
                "input_payload": job.input_payload,
                "max_retries": job.max_retries,
            }

    except AIJob.DoesNotExist:
        return None

    
def _mark_retry(job_id, attempt, message):
    with transaction.atomic():
        job = AIJob.objects.select_for_update().get(pk=job_id)

        if (
            job.status != AIJob.Status.PROCESSING
            or job.attempts != attempt
        ):
            return False

        job.status = AIJob.Status.QUEUED
        job.error_message = message
        job.save(
            update_fields=[
                "status",
                "error_message",
                "updated_at",
            ]
        )
        return True


def _mark_failed(job_id, attempt, message):
    with transaction.atomic():
        job = AIJob.objects.select_for_update().get(pk=job_id)

        if (
            job.status != AIJob.Status.PROCESSING
            or job.attempts != attempt
        ):
            return False

        now = timezone.now()
        job.status = AIJob.Status.FAILED
        job.error_message = message
        job.completed_at = now
        job.duration_ms = _duration_ms(job)

        job.save(
            update_fields=[
                "status",
                "error_message",
                "completed_at",
                "duration_ms",
                "updated_at",
            ]
        )
        return True


def _mark_completed(job_id, attempt, output_payload):
    with transaction.atomic():
        job = AIJob.objects.select_for_update().get(pk=job_id)

        if (
            job.status != AIJob.Status.PROCESSING
            or job.attempts != attempt
        ):
            logger.warning(
                "Ignoring stale AI completion: id=%s attempt=%s",
                job_id,
                attempt,
            )
            return False

        job.status = AIJob.Status.COMPLETED
        job.output_payload = output_payload
        job.error_message = ""
        job.completed_at = timezone.now()
        job.duration_ms = _duration_ms(job)

        job.save(
            update_fields=[
                "status",
                "output_payload",
                "error_message",
                "completed_at",
                "duration_ms",
                "updated_at",
            ]
        )
        return True

def _build_ai_payload(job_type, payload):
    # These fields are for Django persistence, not for FastAPI.
    if job_type == AIJob.JobType.GENERATE_RESUME:
        allowed_fields = (
            "candidate_resume",
            "job_description",
            "target_job_title",
            "target_company",
        )

        return {
            key: payload[key]
            for key in allowed_fields
            if key in payload
        }

    return payload


def _persist_generated_resume(user_id, payload, result):
    """Persist the generated structured resume as a version and sections."""

    expected_types = {
        "personal_info": dict,
        "summary": str,
        "skills": list,
        "experience": list,
        "projects": list,
        "education": list,
        "certifications": list,
        "achievements": list,
        "languages": list,
        "links": list,
    }

    for field, expected_type in expected_types.items():
        if not isinstance(result.get(field), expected_type):
            raise ValueError(
                f"The AI response contained invalid '{field}' data."
            )

    section_mapping = [
        ("personal_info", "CUSTOM", "Personal Information"),
        ("summary", "SUMMARY", "Professional Summary"),
        ("skills", "SKILLS", "Skills"),
        ("experience", "EXPERIENCE", "Experience"),
        ("projects", "PROJECTS", "Projects"),
        ("education", "EDUCATION", "Education"),
        ("certifications", "CERTIFICATIONS", "Certifications"),
        ("achievements", "ACHIEVEMENTS", "Achievements"),
        ("languages", "LANGUAGES", "Languages"),
        ("links", "LINKS", "Links"),
    ]

    resume_id = payload.get("resume_id")
    target_job_title = str(
        payload.get("target_job_title") or ""
    ).strip()
    target_company = str(
        payload.get("target_company") or ""
    ).strip()
    template_name = str(
        payload.get("template_name") or "ATS Classic"
    ).strip() or "ATS Classic"

    with transaction.atomic():
        if resume_id is not None:
            resume = Resume.objects.select_for_update().get(
                pk=resume_id,
                user_id=user_id,
            )

            latest_version = (
                resume.versions.order_by("-version_number")
                .values_list("version_number", flat=True)
                .first()
                or 0
            )

            resume.versions.filter(
                is_current=True,
            ).update(is_current=False)

            next_version_number = latest_version + 1

        else:
            resume_title = str(
                payload.get("resume_title") or ""
            ).strip()

            if not resume_title:
                resume_title = (
                    f"{target_job_title} Resume"
                    if target_job_title
                    else "My Resume"
                )

            resume = Resume.objects.create(
                user_id=user_id,
                title=resume_title,
            )

            next_version_number = 1

        version = ResumeVersion.objects.create(
            resume=resume,
            version_number=next_version_number,
            target_job_title=target_job_title,
            target_company=target_company,
            template_name=template_name,
            is_current=True,
        )

        sections = [
            ResumeSection(
                version=version,
                section_type=section_type,
                title=title,
                content=result[field],
                display_order=order,
                is_visible=True,
            )
            for order, (field, section_type, title)
            in enumerate(section_mapping)
        ]

        ResumeSection.objects.bulk_create(sections)

        resume.save(update_fields=["updated_at"])

    return {
        "id": resume.id,
        "title": resume.title,
        "version_id": version.id,
        "version_number": version.version_number,
        "target_job_title": version.target_job_title,
        "target_company": version.target_company,
        "template_name": version.template_name,
    }

async def _retry_or_fail(
    job_id,
    attempt,
    max_retries,
    message,
):
    if attempt <= max_retries:
        updated = await sync_to_async(
            _mark_retry,
            thread_sensitive=True,
        )(job_id, attempt, message)

        if not updated:
            return {
                "job_id": str(job_id),
                "status": "SUPERSEDED",
            }

        # Exponential backoff: 1, 2, 4 seconds, capped at 30.
        raise Retry(defer=min(2 ** (attempt - 1), 30))

    updated = await sync_to_async(
        _mark_failed,
        thread_sensitive=True,
    )(job_id, attempt, message)

    if not updated:
        return {
            "job_id": str(job_id),
            "status": "SUPERSEDED",
        }

    return {
        "job_id": str(job_id),
        "status": AIJob.Status.FAILED,
    }


async def process_ai_job(ctx, job_id: str):
    """Process one persisted Django AI job."""

    attempt = int(ctx.get("job_try", 1))

    state = await sync_to_async(
        _start_job,
        thread_sensitive=True,
    )(job_id, attempt)

    if state is None:
        logger.error("AI job was not found: %s", job_id)
        return {"job_id": job_id, "status": "NOT_FOUND"}

    if state.get("already_completed"):
        return {
            "job_id": job_id,
            "status": AIJob.Status.COMPLETED,
            "output_payload": state["output_payload"],
        }

    if state.get("terminal"):
        return {
            "job_id": job_id,
            "status": state["status"],
        }

    if state.get("already_processing"):
        logger.info(
            "Skipping duplicate execution for processing job id=%s",
            job_id,
        )
        return {
            "job_id": job_id,
            "status": AIJob.Status.PROCESSING,
            "skipped": True,
        }

    attempt = state["attempt"]
    job_type = state["job_type"]
    payload = state["input_payload"]
    max_retries = state["max_retries"]

    endpoint = AI_ENDPOINTS.get(job_type)

    if not endpoint:
        await sync_to_async(
            _mark_failed,
            thread_sensitive=True,
        )(
            job_id,
            attempt,
            "Unsupported AI job type.",
        )

        return {"job_id": job_id, "status": AIJob.Status.FAILED}

    token = settings.AI_SERVICE_SHARED_TOKEN

    if not token:
        await sync_to_async(
            _mark_failed,
            thread_sensitive=True,
        )(
            job_id,
            attempt,
            "AI service authentication is not configured.",
        )

        return {"job_id": job_id, "status": AIJob.Status.FAILED}

    url = (
        f"{settings.AI_SERVICE_URL.rstrip('/')}"
        f"{endpoint}"
    )

    headers = {
        "X-Internal-Service-Token": token,
    }

    ai_payload = _build_ai_payload(job_type, payload)

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                180.0,
                connect=10.0,
            )
        ) as client:
            response = await client.post(
                url,
                json=ai_payload,
                headers=headers,
            )

            response.raise_for_status()
            result = response.json()

        if not isinstance(result, dict):
            raise ValueError(
                "The AI service returned a non-object response."
            )

        output_payload = result

        if job_type == AIJob.JobType.GENERATE_RESUME:
            resume_details = await sync_to_async(
                _persist_generated_resume,
                thread_sensitive=True,
            )(
                state["user_id"],
                payload,
                result,
            )

            output_payload = {
                "generated_resume": result,
                "resume": resume_details,
            }

        marked = await sync_to_async(
            _mark_completed,
            thread_sensitive=True,
        )(
            job_id,
            attempt,
            output_payload,
        )
        if not marked:
            return {
                "job_id": str(job_id),
                "status": "SUPERSEDED",
            }

        logger.info(
            "AI job completed: id=%s type=%s attempt=%s",
            job_id,
            job_type,
            attempt,
        )

        return {
            "job_id": job_id,
            "status": AIJob.Status.COMPLETED,
        }

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code

        if status_code in {408, 429} or status_code >= 500:
            return await _retry_or_fail(
                job_id,
                attempt,
                max_retries,
                "The AI service is temporarily unavailable.",
            )

        # Authentication failures and invalid requests are not retried.
        message = (
            f"The AI service rejected the request "
            f"(HTTP {status_code})."
        )

        await sync_to_async(
            _mark_failed,
            thread_sensitive=True,
        )(job_id, attempt, message)

        return {"job_id": job_id, "status": AIJob.Status.FAILED}

    except httpx.RequestError:
        return await _retry_or_fail(
            job_id,
            attempt,
            max_retries,
            "Could not connect to the AI service.",
        )

    except Exception:
        logger.exception(
            "AI job processing failed: id=%s type=%s attempt=%s",
            job_id,
            job_type,
            attempt,
        )

        await sync_to_async(
            _mark_failed,
            thread_sensitive=True,
        )(
            job_id,
            attempt,
            "AI job processing failed. Check backend logs.",
        )

        return {"job_id": job_id, "status": AIJob.Status.FAILED}


class WorkerSettings:
    functions = [process_ai_job]

    redis_settings = RedisSettings.from_dsn(
        settings.REDIS_URL
    )

    # One initial attempt plus up to three retries.
    max_tries = 4

    job_timeout = 300
    keep_result = 3600
    max_jobs = 10
    retry_jobs = True