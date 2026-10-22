from django.conf import settings
from django.db import models


class JobDescription(models.Model):
    SOURCE_CHOICES = [
        ("text", "Text"),
        ("file", "File"),
        ("url", "URL"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_descriptions",
    )

    title = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=255)
    description = models.TextField()

    # New fields for imported and AI-parsed job descriptions.
    source_type = models.CharField(
        max_length=10,
        choices=SOURCE_CHOICES,
        default="text",
    )
    source_url = models.URLField(max_length=2048, blank=True)
    parsed_data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.job_title} - {self.company_name}"