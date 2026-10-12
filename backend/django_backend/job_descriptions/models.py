
from django.db import models
from django.conf import settings


class JobDescription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_descriptions",
    )

    title = models.CharField(max_length=255)
    company_name = models.CharField(
        max_length=255,
        blank=True,
    )
    job_title = models.CharField(max_length=255)
    description = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.job_title} - {self.company_name}"
