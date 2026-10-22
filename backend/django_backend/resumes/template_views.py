from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import ResumeTemplate
from .serializers import ResumeTemplateSerializer


class ResumeTemplateListView(generics.ListAPIView):
    """Return the active resume templates in display order."""

    serializer_class = ResumeTemplateSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return ResumeTemplate.objects.filter(
            is_active=True
        ).order_by("display_order", "name")