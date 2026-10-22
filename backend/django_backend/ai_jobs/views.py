from django.shortcuts import render

# Create your views here.
import logging

from asgiref.sync import async_to_sync
from arq import create_pool
from arq.connections import RedisSettings
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination

from resumes.models import Resume

from .models import AIJob
from .serializers import (
    AIJobCreateSerializer,
    AIJobStatusSerializer,
)

logger = logging.getLogger(__name__)


async def enqueue_ai_job(job_id: str) -> None:
    """Add a persistent Django AI job to Redis through ARQ."""

    redis = await create_pool(
        RedisSettings.from_dsn(settings.REDIS_URL)
    )

    try:
        queued_job = await redis.enqueue_job(
            "process_ai_job",
            job_id,
            _job_id=f"ai-job-{job_id}",
            _expires=6 * 60 * 60,
        )

        if queued_job is None:
            raise RuntimeError(
                "The ARQ job already exists in Redis."
            )

    finally:
        await redis.close(close_connection_pool=True)


class AIJobCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_jobs"

    def post(self, request):
        serializer = AIJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job_type = serializer.validated_data["job_type"]
        payload = serializer.validated_data["payload"]

        # Do not allow queued generation against another user's resume.
        if job_type == AIJob.JobType.GENERATE_RESUME:
            resume_id = payload.get("resume_id")

            if resume_id is not None:
                if (
                    isinstance(resume_id, bool)
                    or not isinstance(resume_id, int)
                    or resume_id < 1
                ):
                    return Response(
                        {
                            "resume_id": (
                                "Resume ID must be a positive integer."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                get_object_or_404(
                    Resume,
                    pk=resume_id,
                    user=request.user,
                )

        job = AIJob.objects.create(
            user=request.user,
            job_type=job_type,
            input_payload=payload,
            status=AIJob.Status.QUEUED,
            max_retries=3,
            model_used=settings.OLLAMA_MODEL,
        )

        try:
            async_to_sync(enqueue_ai_job)(str(job.id))

        except Exception:
            logger.exception(
                "Could not enqueue AI job id=%s user_id=%s",
                job.id,
                request.user.pk,
            )

            job.status = AIJob.Status.FAILED
            job.error_message = (
                "The job could not be queued. "
                "Check that Redis is running and the ARQ worker is available."
            )
            job.completed_at = timezone.now()
            job.save(
                update_fields=[
                    "status",
                    "error_message",
                    "completed_at",
                    "updated_at",
                ]
            )

            return Response(
                AIJobStatusSerializer(job).data,
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Do not change status after enqueueing: the worker may already
        # have started processing or even completed the job.
        job.refresh_from_db()

        return Response(
            AIJobStatusSerializer(job).data,
            status=status.HTTP_202_ACCEPTED,
        )


class AIJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        job = get_object_or_404(
            AIJob,
            pk=pk,
            user=request.user,
        )

        return Response(
            AIJobStatusSerializer(job).data,
            status=status.HTTP_200_OK,
        )

class AIJobHistoryPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


class AIJobHistoryView(generics.ListAPIView):
    """
    GET /api/v1/ai-jobs/history/

    Returns the authenticated user's own AI job history.
    Supports status/job_type filters and limit/offset pagination.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = AIJobStatusSerializer
    pagination_class = AIJobHistoryPagination

    def get_queryset(self):
        queryset = AIJob.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        job_type_filter = self.request.query_params.get("job_type")

        valid_statuses = {
            choice[0] for choice in AIJob.Status.choices
        }
        valid_job_types = {
            choice[0] for choice in AIJob.JobType.choices
        }

        if status_filter:
            status_filter = status_filter.upper()

            if status_filter not in valid_statuses:
                raise ValidationError({
                    "status": (
                        f"Invalid status. Choose from: "
                        f"{', '.join(sorted(valid_statuses))}"
                    )
                })

            queryset = queryset.filter(status=status_filter)

        if job_type_filter:
            job_type_filter = job_type_filter.upper()

            if job_type_filter not in valid_job_types:
                raise ValidationError({
                    "job_type": (
                        f"Invalid job type. Choose from: "
                        f"{', '.join(sorted(valid_job_types))}"
                    )
                })

            queryset = queryset.filter(
                job_type=job_type_filter
            )

        return queryset