from django.contrib import admin

from .models import AIJob


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "job_type",
        "status",
        "attempts",
        "model_used",
        "duration_ms",
        "created_at",
        "completed_at",
    )

    list_filter = (
        "status",
        "job_type",
        "model_used",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__username",
        "error_message",
    )

    readonly_fields = (
        "id",
        "user",
        "job_type",
        "status",
        "input_payload",
        "output_payload",
        "error_message",
        "attempts",
        "max_retries",
        "model_used",
        "input_tokens",
        "output_tokens",
        "estimated_cost",
        "duration_ms",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    )

    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 50