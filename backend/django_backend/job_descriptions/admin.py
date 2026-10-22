from django.contrib import admin

from .models import JobDescription


@admin.register(JobDescription)
class JobDescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "job_title",
        "company_name",
        "source_type",
        "user",
        "updated_at",
    )
    list_filter = ("source_type", "created_at")
    search_fields = (
        "title",
        "job_title",
        "company_name",
        "description",
    )
    readonly_fields = ("created_at", "updated_at")