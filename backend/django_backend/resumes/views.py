from django.shortcuts import render

# Create your views here.

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework import mixins
from rest_framework.viewsets import GenericViewSet

from django.http import FileResponse
from rest_framework.exceptions import ValidationError

from .export_utils import build_pdf, build_docx

from .models import Resume, ResumeVersion, ResumeSection
from .serializers import (
    ResumeSerializer,
    ResumeVersionSerializer,
    ResumeSectionSerializer,
)


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Resume.objects
            .filter(user=self.request.user)
            .prefetch_related("versions__sections")
            .order_by("-updated_at")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        resume = serializer.save(user=self.request.user)

        # Every new resume starts with its first version.
        ResumeVersion.objects.create(
            resume=resume,
            version_number=1,
            is_current=True,
        )

    @action(detail=True, methods=["post"], url_path="versions")
    @transaction.atomic
    def create_version(self, request, pk=None):
        resume = self.get_object()

        # version_serializer = ResumeVersionSerializer(data=request.data)
        # version_serializer.is_valid(raise_exception=True)

        latest_number = (
            resume.versions.order_by("-version_number")
            .values_list("version_number", flat=True)
            .first()
            or 0
        )

        serializer = ResumeVersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resume.versions.filter(is_current=True).update(is_current=False)

        version = serializer.save(
            resume=resume,
            version_number=latest_number + 1,
            is_current=True,
        )

        return Response(
            ResumeVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path=r"versions/(?P<version_id>[^/.]+)",
    )
    def retrieve_version(self, request, pk=None, version_id=None):
        resume = self.get_object()

        version = get_object_or_404(
            ResumeVersion.objects.prefetch_related("sections"),
            pk=version_id,
            resume=resume,
        )

        return Response(ResumeVersionSerializer(version).data)

    
    @action(
        detail=True,
        methods=["post"],
        url_path=r"versions/(?P<version_id>[^/.]+)/sections",
    )
    def create_section(self, request, pk=None, version_id=None):
        resume = self.get_object()

        version = get_object_or_404(
            ResumeVersion,
            pk=version_id,
            resume=resume,
        )

        serializer = ResumeSectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        section = serializer.save(version=version)

        return Response(
            ResumeSectionSerializer(section).data,
            status=status.HTTP_201_CREATED,
        )
    
    @action(
        detail=True,
        methods=["post"],
        url_path=r"versions/(?P<version_id>[^/.]+)/restore",
        )
    @transaction.atomic
    def restore_version(self, request, pk=None, version_id=None):
            # Only resumes owned by the logged-in user are accessible.
            resume = self.get_object()

            source_version = get_object_or_404(
                ResumeVersion.objects.prefetch_related("sections"),
                pk=version_id,
                resume=resume,
            )

            # Avoid changing history. Create a new version instead.
            latest_number = (
                resume.versions.order_by("-version_number")
                .values_list("version_number", flat=True)
                .first()
                or 0
            )

            ResumeVersion.objects.filter(
                resume=resume,
                is_current=True,
            ).update(is_current=False)

            restored_version = ResumeVersion.objects.create(
                resume=resume,
                version_number=latest_number + 1,
                target_job_title=source_version.target_job_title,
                target_company=source_version.target_company,
                template_name=source_version.template_name,
                is_current=True,
            )

            # Copy all editable sections into the new version.
            sections = [
                ResumeSection(
                    version=restored_version,
                    section_type=section.section_type,
                    title=section.title,
                    content=section.content,
                    display_order=section.display_order,
                    is_visible=section.is_visible,
                )
                for section in source_version.sections.all()
            ]

            ResumeSection.objects.bulk_create(sections)

            return Response(
                ResumeVersionSerializer(restored_version).data,
                status=status.HTTP_201_CREATED,
            )


    @action(
        detail=True,
        methods=["post"],
        url_path=r"versions/(?P<version_id>[^/.]+)/save",
    )
    @transaction.atomic
    def save_version(self, request, pk=None, version_id=None):
        resume = self.get_object()

        source_version = get_object_or_404(
            ResumeVersion,
            pk=version_id,
            resume=resume,
        )

        sections_data = request.data.get("sections")
        if not isinstance(sections_data, list):
            raise ValidationError({
                "sections": "Provide a list of resume sections."
            })

        # Validate every section before changing anything.
        sections_serializer = ResumeSectionSerializer(
            data=sections_data,
            many=True,
        )
        sections_serializer.is_valid(raise_exception=True)

        latest_number = (
            resume.versions.order_by("-version_number")
            .values_list("version_number", flat=True)
            .first()
            or 0
        )

        # Preserve metadata unless the request supplies new values.
        metadata = {
            "target_job_title": request.data.get(
                "target_job_title",
                source_version.target_job_title,
            ),
            "target_company": request.data.get(
                "target_company",
                source_version.target_company,
            ),
            "template_name": request.data.get(
                "template_name",
                source_version.template_name,
            ),
        }

        metadata_serializer = ResumeVersionSerializer(data=metadata)
        metadata_serializer.is_valid(raise_exception=True)

        ResumeVersion.objects.filter(
            resume=resume,
            is_current=True,
        ).update(is_current=False)

        new_version = ResumeVersion.objects.create(
            resume=resume,
            version_number=latest_number + 1,
            is_current=True,
            **metadata_serializer.validated_data,
        )

        new_sections = [
            ResumeSection(
                version=new_version,
                **section_data,
            )
            for section_data in sections_serializer.validated_data
        ]
        ResumeSection.objects.bulk_create(new_sections)

        return Response(
            ResumeVersionSerializer(new_version).data,
            status=status.HTTP_201_CREATED,
        )


    
    @action(detail=False, methods=["post"], url_path="save-editor")
    @transaction.atomic
    def save_editor(self, request):
        data = request.data.get("data")
        if not isinstance(data, dict):
            raise ValidationError({"data": "Resume data must be an object."})

        allowed_fields = {
            "name", "email", "phone", "address",
            "summary", "education", "skills", "projects", "experience",
        }
        if set(data) - allowed_fields:
            raise ValidationError({"data": "Unexpected resume data fields."})

        for key, value in data.items():
            if not isinstance(value, str):
                raise ValidationError({
                    "data": f"Field '{key}' must be text."
                })
            if len(value) > 20000:
                raise ValidationError({
                    "data": f"Field '{key}' is too long."
                })

        
            resume_id = request.data.get("id")
            title = str(request.data.get("title") or "").strip()[:255]

            if not title:
                title = f"{data.get('name', '').strip() or 'Untitled'} Resume"

            template = str(request.data.get("template") or "classic")[:100]

            # Local drafts exist in browser storage, not in the Django database.
            # Treat them as new resumes instead of using them as database IDs.
            if resume_id in (None, ""):
                resume_id = None

            elif isinstance(resume_id, bool):
                raise ValidationError({
                    "id": "Resume ID must be a valid numeric database ID."
                })

            elif isinstance(resume_id, str) and resume_id.startswith("local-draft-"):
                resume_id = None

            elif isinstance(resume_id, str) and resume_id.isdigit():
                resume_id = int(resume_id)

            elif not isinstance(resume_id, int):
                raise ValidationError({
                    "id": (
                        "Resume ID must be a numeric database ID. "
                        "Local drafts must be saved without an ID."
                    )
                })

            if resume_id is not None and resume_id < 1:
                raise ValidationError({
                    "id": "Resume ID must be a positive integer."
                })

            if resume_id is not None:
                resume = get_object_or_404(
                    Resume.objects.filter(user=request.user),
                    pk=resume_id,
                )
            else:
                # Create a database record for this local draft.
                resume = Resume.objects.create(
                    user=request.user,
                    title=title,
                )

<<<<<<< HEAD
=======
        # Browser-only drafts use IDs such as "local-draft-...".
        # They are not database primary keys, so treat them as new resumes.
        if resume_id not in (None, ""):
            if isinstance(resume_id, bool):
                raise ValidationError({
                    "id": "Resume ID must be a numeric database ID."
                })

            if (
                isinstance(resume_id, str)
                and resume_id.startswith("local-draft-")
            ):
                resume_id = None
            else:
                try:
                    resume_id = int(resume_id)
                except (TypeError, ValueError) as exc:
                    raise ValidationError({
                        "id": (
                            "Resume ID must be a numeric database ID. "
                            "Local drafts should be saved without an ID."
                        )
                    }) from exc

        if resume_id is not None:
            resume = get_object_or_404(
                Resume.objects.filter(user=request.user),
                pk=resume_id,
            )
        else:
            resume = Resume.objects.create(
                user=request.user,
                title=title,
            )
>>>>>>> 1dfb2b3791b8ed8c25abe5b414a9c0863321848c

        resume.title = title
        resume.save()

        latest_number = (
            resume.versions.order_by("-version_number")
            .values_list("version_number", flat=True)
            .first() or 0
        )

        ResumeVersion.objects.filter(
            resume=resume, is_current=True
        ).update(is_current=False)

        version = ResumeVersion.objects.create(
            resume=resume,
            version_number=latest_number + 1,
            template_name=template,
            is_current=True,
        )

        section_values = [
            ("CUSTOM", "Personal Details", {
                "name": data.get("name", ""),
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "address": data.get("address", ""),
            }),
            ("SUMMARY", "Professional Summary", {"text": data.get("summary", "")}),
            ("EDUCATION", "Education", {"text": data.get("education", "")}),
            ("SKILLS", "Technical Skills", {"text": data.get("skills", "")}),
            ("PROJECTS", "Projects", {"text": data.get("projects", "")}),
            ("EXPERIENCE", "Experience", {"text": data.get("experience", "")}),
        ]

        ResumeSection.objects.bulk_create([
            ResumeSection(
                version=version,
                section_type=section_type,
                title=section_title,
                content=content,
                display_order=order,
                is_visible=True,
            )
            for order, (section_type, section_title, content)
            in enumerate(section_values)
        ])

        return Response({
            "id": resume.id,
            "title": resume.title,
            "version_id": version.id,
            "version_number": version.version_number,
            "template": version.template_name,
            "data": data,
            "updated": version.updated_at.isoformat(),
        }, status=status.HTTP_201_CREATED)



    
    @action(
        detail=True,
        methods=["get"],
        url_path="export",
    )
    def export_resume(self, request, pk=None):
        # get_object() uses the existing user-filtered queryset.
        resume = self.get_object()

        format_name = request.query_params.get(
            "file_format", "pdf"
         ).lower()

        if format_name not in {"pdf", "docx"}:
            raise ValidationError({
                "file_format": "Supported formats are pdf and docx."
            })


        version_id = request.query_params.get("version_id")

        versions = resume.versions.all()

        if version_id:
            version = get_object_or_404(
                versions.prefetch_related("sections"),
                pk=version_id,
            )
        else:
            version = get_object_or_404(
                versions.filter(is_current=True).prefetch_related(
                    "sections"
                )
            )

        if format_name == "pdf":
            file_buffer = build_pdf(resume, version)
            content_type = "application/pdf"
            extension = "pdf"
        else:
            file_buffer = build_docx(resume, version)
            content_type = (
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )
            extension = "docx"

        filename = f"resume_{resume.pk}_version_{version.version_number}.{extension}"

        response = FileResponse(
            file_buffer,
            content_type=content_type,
            as_attachment=True,
            filename=filename,
        )
        return response




class ResumeSectionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
 ):
    serializer_class = ResumeSectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ResumeSection.objects.filter(
            version__resume__user=self.request.user
        ).select_related("version", "version__resume")


    @action(detail=False, methods=["post"], url_path="reorder")
    @transaction.atomic
    def reorder(self, request):
        version_id = request.data.get("version_id")
        section_ids = request.data.get("section_ids")

        if version_id is None:
            raise ValidationError({
                "version_id": "This field is required."
            })

        if not isinstance(section_ids, list):
            raise ValidationError({
                "section_ids": "Provide a list of section IDs."
            })

        if len(section_ids) != len(set(map(str, section_ids))):
            raise ValidationError({
                "section_ids": "Duplicate section IDs are not allowed."
            })

        version = get_object_or_404(
            ResumeVersion,
            pk=version_id,
            resume__user=request.user,
        )

        sections = list(
            ResumeSection.objects.filter(version=version)
        )

        existing_ids = {section.pk for section in sections}

        try:
            requested_ids = [int(item) for item in section_ids]
        except (TypeError, ValueError):
            raise ValidationError({
                "section_ids": "Every section ID must be an integer."
            })

        if set(requested_ids) != existing_ids:
            raise ValidationError({
                "section_ids": (
                    "Provide every section ID in this version exactly once."
                )
            })

        sections_by_id = {
            section.pk: section for section in sections
        }

        for position, section_id in enumerate(requested_ids):
            section = sections_by_id[section_id]
            section.display_order = position
            section.save(
                update_fields=["display_order", "updated_at"]
            )

        ordered_sections = (
            ResumeSection.objects
            .filter(version=version)
            .order_by("display_order", "created_at")
        )

        return Response(
            ResumeSectionSerializer(
                ordered_sections,
                many=True,
            ).data
        )



 