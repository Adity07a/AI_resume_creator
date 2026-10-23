from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserProfileSerializer
from .profile_services import calculate_profile_completion

from .career_serializers import (
    CertificationSerializer,
    EducationSerializer,
    ExperienceSerializer,
    ProfileLinkSerializer,
    ProjectSerializer,
    SkillSerializer,
    LanguageSerializer,
    ProfileAchievementSerializer,
    TargetRolePreferenceSerializer,
)
from .models import Certification, Education, Experience, ProfileLink, Project, Skill, UserProfile,Language,ProfileAchievement,TargetRolePreference


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


class LanguageViewSet(ProfileOwnedModelViewSet):
    queryset = Language.objects.select_related(
        "profile",
        "profile__user",
    ).all()

    serializer_class = LanguageSerializer


class ProfileAchievementViewSet(ProfileOwnedModelViewSet):
    queryset = ProfileAchievement.objects.select_related(
        "profile",
        "profile__user",
    ).all()

    serializer_class = ProfileAchievementSerializer


class TargetRolePreferenceViewSet(ProfileOwnedModelViewSet):
    queryset = TargetRolePreference.objects.select_related(
        "profile",
        "profile__user",
    ).all()

    serializer_class = TargetRolePreferenceSerializer



def _serialize_profile_section(profile, related_name, serializer_class):
    queryset = getattr(profile, related_name).all().order_by(
        "display_order",
        "id",
    )

    return serializer_class(queryset, many=True).data


def _career_profile_payload(user, profile):
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_email_verified": user.is_email_verified,
        },
        "profile": UserProfileSerializer(profile).data,
        "experiences": _serialize_profile_section(
            profile, "experiences", ExperienceSerializer
        ),
        "projects": _serialize_profile_section(
            profile, "projects", ProjectSerializer
        ),
        "skills": _serialize_profile_section(
            profile, "skills", SkillSerializer
        ),
        "education": _serialize_profile_section(
            profile, "education_entries", EducationSerializer
        ),
        "certifications": _serialize_profile_section(
            profile, "certifications", CertificationSerializer
        ),
        "links": _serialize_profile_section(
            profile, "links", ProfileLinkSerializer
        ),
        "languages": _serialize_profile_section(
            profile, "languages", LanguageSerializer
        ),
        "achievements": _serialize_profile_section(
            profile, "achievements", ProfileAchievementSerializer
        ),
        "target_role_preferences": _serialize_profile_section(
            profile,
            "target_role_preferences",
            TargetRolePreferenceSerializer,
        ),
        "completion": calculate_profile_completion(profile),
    }


class CareerProfileView(APIView):
    """
    Return all canonical career-profile data in a single response.

    Existing profile and section CRUD endpoints remain unchanged.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        return Response(
            _career_profile_payload(request.user, profile)
        )


class ProfileCompletionView(APIView):
    """Return completion percentage and required/optional indicators."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user
        )

        return Response(calculate_profile_completion(profile))