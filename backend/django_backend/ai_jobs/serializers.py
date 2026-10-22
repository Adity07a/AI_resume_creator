from rest_framework import serializers

from .models import AIJob


class AIJobCreateSerializer(serializers.Serializer):
    job_type = serializers.ChoiceField(
        choices=AIJob.JobType.choices,
    )

    payload = serializers.DictField()

    @staticmethod
    def _require_text(payload, field, minimum_length=1, maximum_length=50000):
        value = payload.get(field)

        if not isinstance(value, str):
            raise serializers.ValidationError({
                field: "This field must be a string."
            })

        value = value.strip()

        if len(value) < minimum_length:
            raise serializers.ValidationError({
                field: f"Enter at least {minimum_length} characters."
            })

        if len(value) > maximum_length:
            raise serializers.ValidationError({
                field: f"Maximum length is {maximum_length} characters."
            })

    @staticmethod
    def _require_resume(payload):
        candidate_resume = payload.get("candidate_resume")

        if not isinstance(candidate_resume, dict) or not candidate_resume:
            raise serializers.ValidationError({
                "candidate_resume": (
                    "A non-empty structured resume object is required."
                )
            })

    def validate(self, attrs):
        job_type = attrs["job_type"]
        payload = attrs["payload"]

        if job_type == AIJob.JobType.PARSE_JOB:
            self._require_text(payload, "description", 20)

        elif job_type == AIJob.JobType.GENERATE_RESUME:
            self._require_resume(payload)
            self._require_text(payload, "job_description", 20)

        elif job_type == AIJob.JobType.GENERATE_SUMMARY:
            self._require_resume(payload)

        elif job_type == AIJob.JobType.IMPROVE_SECTION:
            self._require_text(payload, "section_name", 1, 100)
            self._require_text(payload, "section_content", 1, 15000)

        elif job_type == AIJob.JobType.OPTIMIZE_RESUME:
            self._require_resume(payload)
            self._require_text(payload, "job_description", 20)

        return attrs


class AIJobStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIJob
        fields = [
            "id",
            "job_type",
            "status",
            "attempts",
            "max_retries",
            "model_used",
            "output_payload",
            "error_message",
            "input_tokens",
            "output_tokens",
            "estimated_cost",
            "duration_ms",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

        