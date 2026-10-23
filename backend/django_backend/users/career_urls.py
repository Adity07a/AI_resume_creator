from rest_framework.routers import SimpleRouter
from django.urls import path
from .career_views import (
    CareerProfileView,
    CertificationViewSet,
    EducationViewSet,
    ExperienceViewSet,
    ProfileCompletionView,
    ProfileLinkViewSet,
    ProjectViewSet,
    SkillViewSet,
    LanguageViewSet,
    ProfileAchievementViewSet,
    TargetRolePreferenceViewSet
)

router = SimpleRouter()
router.register("experiences", ExperienceViewSet, basename="profile-experience")
router.register("projects", ProjectViewSet, basename="profile-project")
router.register("skills", SkillViewSet, basename="profile-skill")
router.register("education", EducationViewSet, basename="profile-education")
router.register("certifications", CertificationViewSet, basename="profile-certification")
router.register("links", ProfileLinkViewSet, basename="profile-link")
router.register("languages", LanguageViewSet, basename="profile-language")
router.register(
    "achievements",
    ProfileAchievementViewSet,
    basename="profile-achievement",
)
router.register(
    "target-role-preferences",
    TargetRolePreferenceViewSet,
    basename="target-role-preference",
)


urlpatterns = [
    path("", CareerProfileView.as_view(), name="career-profile"),
    path(
        "completion/",
        ProfileCompletionView.as_view(),
        name="profile-completion",
    ),
] + router.urls