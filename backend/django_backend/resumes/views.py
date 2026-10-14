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



 