from rest_framework import serializers

from .models import Certification, Education, Experience,Language,ProfileAchievement, ProfileLink, Project, Skill,TargetRolePreference


class StringListField(serializers.ListField):
    """Validate JSON-backed collections as lists of non-empty strings."""

    child = serializers.CharField(max_length=500, allow_blank=False, trim_whitespace=True)
    default = list
    required = False
    allow_empty = True

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 50)
        super().__init__(*args, **kwargs)


class DateRangeValidationMixin:
    def _effective(self, attrs, field):
        if field in attrs:
            return attrs[field]
        if self.instance is not None:
            return getattr(self.instance, field)
        return None

    def validate_date_range(self, attrs, *, current_field=None, end_field="end_date"):
        start = self._effective(attrs, "start_date")
        end = self._effective(attrs, end_field)
        if start and end and end < start:
            raise serializers.ValidationError({end_field: "End date cannot be earlier than start date."})
        if current_field and self._effective(attrs, current_field) and end:
            raise serializers.ValidationError({end_field: f"Clear {end_field} when {current_field.replace('_', ' ')} is true."})
        return attrs


class ExperienceSerializer(DateRangeValidationMixin, serializers.ModelSerializer):
    achievements = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    technologies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    domain_tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    class Meta:
        model = Experience
        fields = [
            "id", "company", "job_title", "location", "start_date", "end_date",
            "currently_working", "description", "achievements", "technologies",
            "domain_tags", "display_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_company(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Company is required.")
        return value

    def validate_job_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Job title is required.")
        return value

    def validate(self, attrs):
        return self.validate_date_range(attrs, current_field="currently_working")

    


class ProjectSerializer(DateRangeValidationMixin, serializers.ModelSerializer):
    achievements = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    technologies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    class Meta:
        model = Project
        fields = [
            "id", "name", "role", "description", "technologies", "achievements",
            "project_url", "start_date", "end_date", "display_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"project_url": {"required": False, "allow_blank": True}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Project name is required.")
        return value

    def validate_project_url(self, value):
        if value and not value.lower().startswith(("https://", "http://")):
            raise serializers.ValidationError("Project URL must use HTTP or HTTPS.")
        return value

    def validate(self, attrs):
        return self.validate_date_range(attrs)

    achievements = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )

    technologies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "id", "name", "category", "proficiency", "years_experience",
            "display_order", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"proficiency": {"required": False, "allow_blank": True}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Skill name is required.")
        return value

    def validate_years_experience(self, value):
        if value is not None and (value < 0 or value > 60):
            raise serializers.ValidationError("Years of experience must be between 0 and 60.")
        return value


class EducationSerializer(DateRangeValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            "id", "institution", "degree", "field_of_study", "location", "start_date",
            "end_date", "currently_studying", "grade", "description", "display_order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_institution(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Institution is required.")
        return value

    def validate_degree(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Degree or qualification is required.")
        return value

    def validate(self, attrs):
        return self.validate_date_range(attrs, current_field="currently_studying")




class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = [
            "id", "name", "issuing_organization", "issue_date", "expiration_date",
            "does_not_expire", "credential_id", "credential_url", "display_order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "issuing_organization": {"required": False, "allow_blank": True},
            "credential_id": {"required": False, "allow_blank": True},
            "credential_url": {"required": False, "allow_blank": True},
        }

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Certification name is required.")
        return value

    def validate_credential_url(self, value):
        if value and not value.lower().startswith(("https://", "http://")):
            raise serializers.ValidationError("Credential URL must use HTTP or HTTPS.")
        return value

    def validate(self, attrs):
        issue_date = attrs.get("issue_date", getattr(self.instance, "issue_date", None))
        expiration_date = attrs.get("expiration_date", getattr(self.instance, "expiration_date", None))
        does_not_expire = attrs.get("does_not_expire", getattr(self.instance, "does_not_expire", False))
        if issue_date and expiration_date and expiration_date < issue_date:
            raise serializers.ValidationError({"expiration_date": "Expiration date cannot be earlier than issue date."})
        if does_not_expire and expiration_date:
            raise serializers.ValidationError({"expiration_date": "Clear expiration_date when does_not_expire is true."})
        return attrs


class ProfileLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileLink
        fields = ["id", "label", "link_type", "url", "display_order", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_label(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Link label is required.")
        return value

    def validate_url(self, value):
        if not value.lower().startswith(("https://", "http://")):
            raise serializers.ValidationError("URL must use HTTP or HTTPS.")
        return value


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = [
            "id",
            "name",
            "proficiency",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Language name is required."
            )

        return value


class ProfileAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileAchievement
        fields = [
            "id",
            "title",
            "description",
            "organization",
            "achieved_on",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Achievement title is required."
            )

        return value


class TargetRolePreferenceSerializer(serializers.ModelSerializer):
    preferred_locations = StringListField(required=False, default=list)
    industries = StringListField(required=False, default=list)

    work_modes = serializers.ListField(
        child=serializers.ChoiceField(
            choices=["remote", "hybrid", "onsite"]
        ),
        required=False,
        default=list,
    )

    employment_types = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                "full_time",
                "part_time",
                "contract",
                "internship",
                "temporary",
            ]
        ),
        required=False,
        default=list,
    )

    class Meta:
        model = TargetRolePreference
        fields = [
            "id",
            "target_role",
            "preferred_locations",
            "work_modes",
            "employment_types",
            "industries",
            "notes",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_target_role(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Target role is required."
            )

        return value


