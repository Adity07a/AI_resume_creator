from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import JobDescription
from .serializers import JobDescriptionSerializer

# Create your views here.
class JobDescriptionViewSet(viewsets.ModelViewSet):
    serializer_class=JobDescriptionSerializer
    permission_classes=[IsAuthenticated]

    def get_queryset(self):
        return JobDescription.objects.filter(
            user=self.request.user
        )

    def perform_create(self,serializer):
        serializer.save(user=self.request.user)

