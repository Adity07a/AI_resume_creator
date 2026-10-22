from django.db import models

# Create your models here.
import uuid

from django.conf import settings


class AIJob(models.Model):
    class JobType(models.TextChoices):
        PARSE_JOB = "PARSE_JOB", "Parse Job Description"
        GENERATE_RESUME = "GENERATE_RESUME", "Generate Resume"
        GENERATE_SUMMARY = "GENERATE_SUMMARY", "Generate Summary"
        IMPROVE_SECTION = "IMPROVE_SECTION", "Improve Section"
        OPTIMIZE_RESUME = "OPTIMIZE_RESUME", "Optimize Resume"

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        QUEUED = "QUEUED", "Queued"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_jobs",
    )

    job_type = models.CharField(
        max_length=40,
        choices=JobType.choices,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
        db_index=True,
    )

    # Inputs may contain private resume and job-description information.
    input_payload = models.JSONField(default=dict)

    # Populated when the AI task completes successfully.
    output_payload = models.JSONField(
        null=True,
        blank=True,
    )

    error_message = models.TextField(blank=True)

    attempts = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)

    model_used = models.CharField(
        max_length=100,
        default="qwen2.5:3b",
    )

    input_tokens = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    output_tokens = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    estimated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        null=True,
        blank=True,
    )

    duration_ms = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "-created_at"],
                name="aijob_user_created_idx",
            ),
            models.Index(
                fields=["status", "created_at"],
                name="aijob_status_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.job_type} - {self.id} ({self.status})"