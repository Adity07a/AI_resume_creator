from django.db import models
from django.conf import settings

# Create your models here.

class Resume(models.Model):
    "Represents user's resume"
    user=models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resumes",
    )

    title=models.CharField(
        max_length=255,
        default="My Resume",
    )

    created_at=models.DateTimeField(
        auto_now_add=True,
    )

    updated_at=models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.title}-{self.user.email}"



class ResumeVersion(models.Model):
    "represents a specific version of a resume"
    resume=models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name="versions",
    )

    version_number=models.PositiveIntegerField()

    target_job_title=models.CharField(
        max_length=255,
        blank=True,
    )

    target_company=models.CharField(
        max_length=255,
        blank=True,
    )

    template_name=models.CharField(
        max_length=100,
        default="ATS Classic"
    )

    is_current=models.BooleanField(
        default=True,
    )

    created_at=models.DateTimeField(
        auto_now_add=True,
    )
    updated_at=models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.resume.title}"
            f"-Version {self.version_number}"
        )


class ResumeSection(models.Model):
    "Individual editable section of a resume version"

    class SectionType(models.TextChoices):
        SUMMARY="SUMMARY","Summary"
        EXPERIENCE="EXPERIENCE","Experience"
        PROJECTS="PROJECTS","Projects"
        EDUCATION="EDUCATION","Education"
        SKILLS="SKILLS","Skills"
        CERTIFICATIONS="CERTIFICATIONS","Certifications"
        ACHIEVEMENTS="ACHIEVEMENTS","Achievements"
        LANGUAGES="LANGUAGES","Languages"
        LINKS="LINKS","Links"
        CUSTOM="CUSTOM","Custom"

    version=models.ForeignKey(
        ResumeVersion,
        on_delete=models.CASCADE,
        related_name="sections",
    )

    section_type=models.CharField(
        max_length=50,
        choices=SectionType.choices,
    )

    title=models.CharField(
        max_length=255,
    )

    content=models.JSONField(
        default=dict,
    )
    display_order=models.PositiveIntegerField(
        default=0,
    )

    is_visible=models.BooleanField(
        default=True,
    )

    created_at=models.DateTimeField(
        auto_now_add=True,
    )

    updated_at=models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering=["display_order","created_at"]

    def __str__(self):
        return (
            f"{self.version} - "
            f"{self.title}"
        )

    
class ResumeTemplate(models.Model):
    class Category(models.TextChoices):
        ATS_FRIENDLY = "ats_friendly", "ATS Friendly"
        PROFESSIONAL = "professional", "Professional"
        MODERN = "modern", "Modern"
        MINIMAL = "minimal", "Minimal"
        TECHNICAL = "technical", "Technical"
        EXECUTIVE = "executive", "Executive"

    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.ATS_FRIENDLY,
    )

    preview_image_url = models.URLField(
        max_length=2048,
        blank=True,
    )

    is_ats_friendly = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    # Metadata that the frontend can use to render a template.
    layout_config = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name

class ResumeAnalysis(models.Model):
    """A persistent analysis of one resume version against one job."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        QUEUED = "QUEUED", "Queued"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resume_analyses",
    )

    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name="analyses",
    )

    resume_version = models.ForeignKey(
        ResumeVersion,
        on_delete=models.CASCADE,
        related_name="analyses",
    )

    job_description = models.ForeignKey(
        "job_descriptions.JobDescription",
        on_delete=models.CASCADE,
        related_name="resume_analyses",
    )
    target_job_title = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    target_company = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    job_description_text = models.TextField(blank=True)

    parsed_job_data = models.JSONField(
        default=dict,
        blank=True,
    )
    # Connects this analysis to the existing ARQ-managed job.
    ai_job = models.OneToOneField(
        "ai_jobs.AIJob",
        on_delete=models.SET_NULL,
        related_name="resume_analysis",
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    result = models.JSONField(
        default=dict,
        blank=True,
    )

    error_message = models.TextField(blank=True)

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
                name="ra_user_created_idx",
            ),
            models.Index(
                fields=["user", "status"],
                name="ra_user_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"Analysis {self.pk}: {self.resume.title} "
            f"({self.status})"
        )

