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



 