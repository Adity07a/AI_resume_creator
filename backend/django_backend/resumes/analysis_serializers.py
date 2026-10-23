from rest_framework import serializers

from .models import ResumeAnalysis


class ResumeAnalysisCreateSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField(min_value=1)

    # Optional: omitted means analyze the resume's current version.
    resume_version_id = serializers.IntegerField(
        required=False,
        min_value=1,
    )

    job_description_id = serializers.IntegerField(min_value=1)

    target_job_title = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default="",
    )


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    resume_id = serializers.IntegerField(read_only=True)
    resume_title = serializers.CharField(
        source="resume.title",
        read_only=True,
    )
    resume_version_id = serializers.IntegerField(read_only=True)
    resume_version_number = serializers.IntegerField(
        source="resume_version.version_number",
        read_only=True,
    )
    job_description_id = serializers.IntegerField(read_only=True)
    target_job_title = serializers.CharField(read_only=True)
    target_company = serializers.CharField(read_only=True)
    ai_job_id = serializers.UUIDField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = ResumeAnalysis
        fields = [
            "id",
            "resume_id",
            "resume_title",
            "resume_version_id",
            "resume_version_number",
            "job_description_id",
            "target_job_title",
            "target_company",
            "ai_job_id",
            "status",
            "result",
            "error_message",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields