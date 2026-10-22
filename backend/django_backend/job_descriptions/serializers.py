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
            "source_type",
            "source_url",
            "parsed_data",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source_type",
            "source_url",
            "parsed_data",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Title cannot be empty."
            )
        return value

    def validate_job_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Job title cannot be empty."
            )
        return value

    def validate_description(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                "Job description cannot be empty."
            )
        if len(value) > 50000:
            raise serializers.ValidationError(
                "Maximum description length is 50000 characters."
            )
        return value