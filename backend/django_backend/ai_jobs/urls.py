from django.urls import path

from .views import (
    AIJobCreateView,
    AIJobDetailView,
    AIJobHistoryView,
)

urlpatterns = [
    path(
        "",
        AIJobCreateView.as_view(),
        name="ai-job-create",
    ),
    path(
        "history/",
        AIJobHistoryView.as_view(),
        name="ai-job-history",
    ),
    path(
        "<uuid:pk>/",
        AIJobDetailView.as_view(),
        name="ai-job-detail",
    ),
]