
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers, status

from ai_client.services import call_ai_service, AIServiceError


class GenerateSummaryRequestSerializer(serializers.Serializer):
    candidate_resume = serializers.DictField(
        required=True,
        help_text="Parsed or edited resume data",
    )
    target_job_title = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
    job_description = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class GenerateSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateSummaryRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        payload = serializer.validated_data

        if not payload["candidate_resume"]:
            return Response(
                {"detail": "Candidate resume data cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/generate-summary",
                payload=payload,
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        summary = result.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            return Response(
                {"detail": "The AI service returned an invalid summary."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"summary": summary.strip()},
            status=status.HTTP_200_OK,
        )



class GenerateResumeRequestSerializer(serializers.Serializer):
    candidate_resume = serializers.DictField(required=True)
    job_description = serializers.CharField(
        required=True,
        min_length=20,
    )
    target_job_title = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
    target_company = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class GenerateResumeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = GenerateResumeRequestSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        payload = serializer.validated_data

        if not payload["candidate_resume"]:
            return Response(
                {"detail": "Candidate resume data cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/generate-resume",
                payload=payload,
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(result, status=status.HTTP_200_OK)


