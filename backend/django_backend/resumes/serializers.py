from rest_framework import serializers

from .models import Resume, ResumeVersion, ResumeSection, ResumeTemplate


class ResumeSectionSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = ResumeSection
        fields = [
            "id",
            "section_type",
            "title",
            "content",
            "display_order",
            "is_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ResumeVersionSerializer(serializers.ModelSerializer):
    sections = ResumeSectionSerializer(many=True, read_only=True)

    class Meta:
        model = ResumeVersion
        fields = [
            "id",
            "version_number",
            "target_job_title",
            "target_company",
            "template_name",
            "is_current",
            "sections",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "version_number",
            "is_current",
            "sections",
            "created_at",
            "updated_at",
        ]


class ResumeSerializer(serializers.ModelSerializer):
    versions = ResumeVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Resume
        fields = [
            "id",
            "title",
            "versions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]



class ResumeTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeTemplate
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "category",
            "preview_image_url",
            "is_ats_friendly",
            "is_active",
            "display_order",
            "layout_config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields