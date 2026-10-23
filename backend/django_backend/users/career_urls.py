from rest_framework.routers import SimpleRouter

from .career_views import (
    CertificationViewSet,
    EducationViewSet,
    ExperienceViewSet,
    ProfileLinkViewSet,
    ProjectViewSet,
    SkillViewSet,
)

router = SimpleRouter()
router.register("experiences", ExperienceViewSet, basename="profile-experience")
router.register("projects", ProjectViewSet, basename="profile-project")
router.register("skills", SkillViewSet, basename="profile-skill")
router.register("education", EducationViewSet, basename="profile-education")
router.register("certifications", CertificationViewSet, basename="profile-certification")
router.register("links", ProfileLinkViewSet, basename="profile-link")

urlpatterns = router.urls
