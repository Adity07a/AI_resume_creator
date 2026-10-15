
from django.urls import path
from rest_framework.routers import DefaultRouter

from .ai_views import (
    GenerateSummaryView,
    GenerateResumeView,
    ParseJobProxyView,
    OptimizeResumeProxyView,
    ImproveSectionProxyView,
)
from .views import ResumeViewSet


router = DefaultRouter()
router.register("", ResumeViewSet, basename="resume")

urlpatterns = router.urls + [
    path(
        "ai/generate-summary/",
        GenerateSummaryView.as_view(),
        name="ai-generate-summary",
    ),
    path(
        "ai/generate-resume/",
        GenerateResumeView.as_view(),
        name="ai-generate-resume",
    ),
    path(
        "ai/parse-job/",
        ParseJobProxyView.as_view(),
        name="ai-parse-job",
    ),
    path(
        "ai/optimize-resume/",
        OptimizeResumeProxyView.as_view(),
        name="ai-optimize-resume",
    ),
    path(
        "ai/improve-section/",
        ImproveSectionProxyView.as_view(),
        name="ai-improve-section",
    ),
]
