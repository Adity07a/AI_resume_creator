from django.contrib import admin
from .models import Resume,ResumeVersion,ResumeSection
# Register your models here.

@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display=(
        "title",
        "user",
        "created_at",
        "updated_at",
    )

    search_fields=(
        "title",
        "user__email",
    )

@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display=(
        "resume",
        "version_number",
        "target_job_title",
        "target_company",
        "template_name",
        "is_current",
    )

    list_filter=(
        "template_name",
        "is_current",
    )

    search_fields=(
        "resume__title",
        "resume__user__email",
        "target_job_title",
        "target_company",
    )

@admin.register(ResumeSection)
class ResumeSectionAdmin(admin.ModelAdmin):
    list_display=(
        "version",
        "section_type",
        "title",
        "display_order",
        "is_visible",
    )

    list_filter=(
        "section_type",
        "is_visible",
    )

    search_fields=(
        "title",
        "version__resume__title",
    )
    
