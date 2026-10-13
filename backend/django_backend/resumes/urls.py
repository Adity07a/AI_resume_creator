
from rest_framework.routers import DefaultRouter  # type: ignore
from django.urls import path  # type: ignore

from .ai_views import GenerateSummaryView, GenerateResumeView
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
    
]
