import logging

from asgiref.sync import async_to_sync
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_jobs.models import AIJob
from ai_jobs.views import enqueue_ai_job
from job_descriptions.models import JobDescription

from .analysis_services import build_candidate_resume_from_version
from .analysis_serializers import (
    ResumeAnalysisCreateSerializer,
    ResumeAnalysisSerializer,
)
from .models import Resume, ResumeAnalysis, ResumeVersion


logger = logging.getLogger(__name__)


def _has_candidate_content(candidate):
    """Prevent an analysis request against a completely empty resume."""

    personal = candidate.get("personal_info", {})

    if isinstance(personal, dict) and any(
        str(value).strip()
        for value in personal.values()
        if value is not None
    ):
        return True

    if str(candidate.get("summary", "")).strip():
        return True

    return any(
        candidate.get(key)
        for key in (
            "skills",
            "experience",
            "projects",
            "education",
            "certifications",
            "achievements",
            "languages",
            "links",
            "custom_sections",
        )
    )


class ResumeAnalysisListCreateView(APIView):
    """
    POST /api/v1/analysis/ creates and queues an analysis.
    GET  /api/v1/analysis/ returns the user's analysis history.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            ResumeAnalysis.objects
            .filter(user=request.user)
            .select_related(
                "resume",
                "resume_version",
                "job_description",
                "ai_job",
            )
            .order_by("-created_at")
        )

        status_filter = request.query_params.get("status")

        if status_filter:
            status_filter = status_filter.upper()

            valid_statuses = {
                value
                for value, _label in ResumeAnalysis.Status.choices
            }

            if status_filter not in valid_statuses:
                raise ValidationError({
                    "status": (
                        "Choose one of: "
                        + ", ".join(sorted(valid_statuses))
                    )
                })

            queryset = queryset.filter(status=status_filter)

        resume_id = request.query_params.get("resume_id")

        if resume_id:
            try:
                parsed_resume_id = int(resume_id)
            except (TypeError, ValueError) as exc:
                raise ValidationError({
                    "resume_id": "Must be a positive integer."
                }) from exc

            if parsed_resume_id < 1:
                raise ValidationError({
                    "resume_id": "Must be a positive integer."
                })

            queryset = queryset.filter(
                resume_id=parsed_resume_id
            )

        paginator = LimitOffsetPagination()
        paginator.default_limit = 20
        paginator.max_limit = 100

        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        data = ResumeAnalysisSerializer(
            page,
            many=True,
        ).data

        return paginator.get_paginated_response(data)

    def post(self, request):
        create_serializer = ResumeAnalysisCreateSerializer(
            data=request.data
        )
        create_serializer.is_valid(raise_exception=True)

        data = create_serializer.validated_data

        # Resolve the resume using the authenticated owner.
        resume = get_object_or_404(
            Resume.objects.filter(user=request.user),
            pk=data["resume_id"],
        )

        # Resolve the target job description using the same owner.
        job_description = get_object_or_404(
            JobDescription.objects.filter(user=request.user),
            pk=data["job_description_id"],
        )

        version_id = data.get("resume_version_id")

        if version_id is not None:
            version = get_object_or_404(
                ResumeVersion.objects.filter(resume=resume),
                pk=version_id,
            )
        else:
            version = resume.versions.filter(
                is_current=True
            ).first()

            if version is None:
                raise ValidationError({
                    "resume_id": (
                        "This resume has no current version. "
                        "Create or restore a version before analyzing it."
                    )
                })

        candidate_resume = build_candidate_resume_from_version(
            version
        )

        if not _has_candidate_content(candidate_resume):
            raise ValidationError({
                "resume_version_id": (
                    "The selected version has no visible resume content."
                )
            })

        description = job_description.description.strip()

        if len(description) < 20:
            raise ValidationError({
                "job_description_id": (
                    "The saved job description must contain "
                    "at least 20 characters."
                )
            })

        parsed_job = job_description.parsed_data

        if not isinstance(parsed_job, dict):
            parsed_job = {}

        target_job_title = (
            data.get("target_job_title", "").strip()
            or job_description.job_title.strip()
            or str(parsed_job.get("job_title") or "").strip()
        )

        payload = {
            "candidate_resume": candidate_resume,
            "job_description": description,
            "target_job_title": target_job_title,
            "parsed_job": parsed_job,
        }

        # Save the analysis and its queue record together.
        # Enqueue only after the database transaction commits.
        with transaction.atomic():
            ai_job = AIJob.objects.create(
                user=request.user,
                job_type=AIJob.JobType.OPTIMIZE_RESUME,
                input_payload=payload,
                status=AIJob.Status.QUEUED,
                max_retries=3,
                model_used=settings.OLLAMA_MODEL,
            )

            analysis = ResumeAnalysis.objects.create(
                user=request.user,
                resume=resume,
                resume_version=version,
                job_description=job_description,
                ai_job=ai_job,
                status=ResumeAnalysis.Status.QUEUED,
                target_job_title=target_job_title,
                target_company=job_description.company_name,
                job_description_text=description,
                parsed_job_data=parsed_job,
            )

        try:
            async_to_sync(enqueue_ai_job)(
                str(ai_job.pk)
            )

        except Exception:
            logger.exception(
                "Could not queue resume analysis "
                "analysis_id=%s user_id=%s",
                analysis.pk,
                request.user.pk,
            )

            now = timezone.now()

            with transaction.atomic():
                ai_job.status = AIJob.Status.FAILED
                ai_job.error_message = (
                    "The analysis could not be queued. "
                    "Check Redis and the ARQ worker."
                )
                ai_job.completed_at = now
                ai_job.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "completed_at",
                        "updated_at",
                    ]
                )

                analysis.status = ResumeAnalysis.Status.FAILED
                analysis.error_message = (
                    "The analysis could not be queued. "
                    "Please retry after checking the worker."
                )
                analysis.completed_at = now
                analysis.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "completed_at",
                        "updated_at",
                    ]
                )

            analysis.refresh_from_db()

            return Response(
                ResumeAnalysisSerializer(analysis).data,
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        analysis.refresh_from_db()

        return Response(
            ResumeAnalysisSerializer(analysis).data,
            status=status.HTTP_202_ACCEPTED,
        )


class ResumeAnalysisDetailView(APIView):
    """Return one analysis only if it belongs to the requesting user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        analysis = get_object_or_404(
            ResumeAnalysis.objects.select_related(
                "resume",
                "resume_version",
                "job_description",
                "ai_job",
            ),
            pk=pk,
            user=request.user,
        )

        return Response(
            ResumeAnalysisSerializer(analysis).data,
            status=status.HTTP_200_OK,
        )