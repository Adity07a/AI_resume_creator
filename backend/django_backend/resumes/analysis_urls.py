from django.urls import path

from .analysis_views import (
    ResumeAnalysisDetailView,
    ResumeAnalysisListCreateView,
)


urlpatterns = [
    path(
        "",
        ResumeAnalysisListCreateView.as_view(),
        name="analysis-list-create",
    ),
    path(
        "<int:pk>/",
        ResumeAnalysisDetailView.as_view(),
        name="analysis-detail",
    ),
]