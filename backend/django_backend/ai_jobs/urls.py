from django.urls import path

from .views import AIJobCreateView, AIJobDetailView


urlpatterns = [
    path(
        "",
        AIJobCreateView.as_view(),
        name="ai-job-create",
    ),
    path(
        "<uuid:pk>/",
        AIJobDetailView.as_view(),
        name="ai-job-detail",
    ),
]