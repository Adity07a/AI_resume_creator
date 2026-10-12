
from rest_framework import serializers
from .models import JobDescription


class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = [
            "id",
            "title",
            "company_name",
            "job_title",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value.strip()

    def validate_job_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("Job title cannot be empty.")
        return value.strip()

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("Job description cannot be empty.")
        return value.strip()
