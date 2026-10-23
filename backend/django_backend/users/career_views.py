from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .career_serializers import (
    CertificationSerializer,
    EducationSerializer,
    ExperienceSerializer,
    ProfileLinkSerializer,
    ProjectSerializer,
    SkillSerializer,
)
from .models import Certification, Education, Experience, ProfileLink, Project, Skill, UserProfile


class ProfileOwnedModelViewSet(viewsets.ModelViewSet):
    """Restrict each list/detail query to the authenticated user's profile."""

    permission_classes = [IsAuthenticated]
    profile_model = UserProfile

    def get_queryset(self):
        return self.queryset.filter(profile__user=self.request.user)

    def perform_create(self, serializer):
        profile, _ = self.profile_model.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class ExperienceViewSet(ProfileOwnedModelViewSet):
    queryset = Experience.objects.select_related("profile", "profile__user").all()
    serializer_class = ExperienceSerializer


class ProjectViewSet(ProfileOwnedModelViewSet):
    queryset = Project.objects.select_related("profile", "profile__user").all()
    serializer_class = ProjectSerializer


class SkillViewSet(ProfileOwnedModelViewSet):
    queryset = Skill.objects.select_related("profile", "profile__user").all()
    serializer_class = SkillSerializer


class EducationViewSet(ProfileOwnedModelViewSet):
    queryset = Education.objects.select_related("profile", "profile__user").all()
    serializer_class = EducationSerializer


class CertificationViewSet(ProfileOwnedModelViewSet):
    queryset = Certification.objects.select_related("profile", "profile__user").all()
    serializer_class = CertificationSerializer


class ProfileLinkViewSet(ProfileOwnedModelViewSet):
    queryset = ProfileLink.objects.select_related("profile", "profile__user").all()
    serializer_class = ProfileLinkSerializer
