
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers, status
from pathlib import Path
from ai_client.services import call_ai_service, call_ai_service_file, AIServiceError
from .models import Resume, ResumeVersion, ResumeSection
from .serializers import ResumeVersionSerializer


MAX_RESUME_UPLOAD_SIZE = 5 * 1024 * 1024

SUPPORTED_RESUME_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
}


class ParseResumeProxyView(APIView):
    """Authenticate a resume upload and forward it to FastAPI."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if uploaded_file is None:
            return Response(
                {"file": ["Upload a resume using the 'file' field."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalize the filename before checking its extension.
        filename = (
            (uploaded_file.name or "")
            .replace("\\", "/")
            .rsplit("/", 1)[-1]
        )

        extension = Path(filename).suffix.lower()

        if extension not in SUPPORTED_RESUME_EXTENSIONS:
            return Response(
                {
                    "file": [
                        "Unsupported file type. Upload a PDF, DOCX, or TXT."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > MAX_RESUME_UPLOAD_SIZE:
            return Response(
                {"file": ["Maximum resume upload size is 5 MB."]},
                status=413,
            )

        # Read no more than the limit plus one byte. This also protects
        # against a discrepancy between the reported and actual size.
        file_content = uploaded_file.read(
            MAX_RESUME_UPLOAD_SIZE + 1
        )

        if not file_content:
            return Response(
                {"file": ["The uploaded file is empty."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(file_content) > MAX_RESUME_UPLOAD_SIZE:
            return Response(
                {"file": ["Maximum resume upload size is 5 MB."]},
                status=413,
            )

        try:
            result = call_ai_service_file(
                endpoint="/api/v1/ai/parse-resume",
                file_name=filename,
                file_content=file_content,
                content_type=(
                    uploaded_file.content_type
                    or "application/octet-stream"
                ),
            )

        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=(
                    exc.status_code
                    or status.HTTP_502_BAD_GATEWAY
                ),
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

class AIProxyView(APIView):
    permission_classes = [IsAuthenticated]
    ai_endpoint = ""

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint=self.ai_endpoint,
                payload=request.data,
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(result, status=status.HTTP_200_OK)


class ParseJobProxyView(AIProxyView):
    ai_endpoint = "/api/v1/ai/parse-job"


class OptimizeResumeProxyView(AIProxyView):
    ai_endpoint = "/api/v1/ai/optimize-resume"


class ImproveSectionProxyView(AIProxyView):
    ai_endpoint = "/api/v1/ai/improve-section"

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

    # Supply this to create another version of an existing resume.
    # Omit it to create a new resume.
    resume_id = serializers.IntegerField(
        required=False,
        min_value=1,
    )
    resume_title = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=255,
    )
    template_name = serializers.CharField(
        required=False,
        allow_blank=True,
        default="ATS Classic",
        max_length=100,
    )


class GenerateResumeView(APIView):
    permission_classes = [IsAuthenticated]

    SECTION_MAPPING = [
        ("personal_info", "CUSTOM", "Personal Information"),
        ("summary", "SUMMARY", "Professional Summary"),
        ("skills", "SKILLS", "Skills"),
        ("experience", "EXPERIENCE", "Experience"),
        ("projects", "PROJECTS", "Projects"),
        ("education", "EDUCATION", "Education"),
        ("certifications", "CERTIFICATIONS", "Certifications"),
        ("achievements", "ACHIEVEMENTS", "Achievements"),
        ("languages", "LANGUAGES", "Languages"),
        ("links", "LINKS", "Links"),
    ]

    EXPECTED_TYPES = {
        "personal_info": dict,
        "summary": str,
        "skills": list,
        "experience": list,
        "projects": list,
        "education": list,
        "certifications": list,
        "achievements": list,
        "languages": list,
        "links": list,
    }

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

        resume_id = payload.get("resume_id")

        # Check ownership before spending time on AI generation.
        if resume_id is not None:
            get_object_or_404(
                Resume,
                pk=resume_id,
                user=request.user,
            )

        # Do not send Django-only fields to FastAPI.
        ai_payload = {
            "candidate_resume": payload["candidate_resume"],
            "job_description": payload["job_description"],
            "target_job_title": payload["target_job_title"],
            "target_company": payload["target_company"],
        }

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/generate-resume",
                payload=ai_payload,
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Validate the AI response before writing anything to the database.
        if not isinstance(result, dict):
            return Response(
                {"detail": "The AI service returned an invalid resume."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        for field, expected_type in self.EXPECTED_TYPES.items():
            value = result.get(field)

            # bool is not relevant here, but exact top-level types matter.
            if not isinstance(value, expected_type):
                return Response(
                    {
                        "detail": (
                            "The AI service returned an invalid value "
                            f"for '{field}'."
                        )
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        target_job_title = payload["target_job_title"].strip()
        target_company = payload["target_company"].strip()
        template_name = (
            payload.get("template_name") or "ATS Classic"
        ).strip() or "ATS Classic"

        # Save the resume, version, and all sections as one transaction.
        # If any database write fails, the entire save is rolled back.
        with transaction.atomic():
            if resume_id is not None:
                resume = get_object_or_404(
                    Resume.objects.select_for_update(),
                    pk=resume_id,
                    user=request.user,
                )

                latest_version_number = (
                    resume.versions.order_by("-version_number")
                    .values_list("version_number", flat=True)
                    .first()
                    or 0
                )

                resume.versions.filter(is_current=True).update(
                    is_current=False
                )

                next_version_number = latest_version_number + 1

            else:
                resume_title = payload["resume_title"].strip()

                if not resume_title:
                    resume_title = (
                        f"{target_job_title} Resume"
                        if target_job_title
                        else "My Resume"
                    )

                resume = Resume.objects.create(
                    user=request.user,
                    title=resume_title,
                )
                next_version_number = 1

            version = ResumeVersion.objects.create(
                resume=resume,
                version_number=next_version_number,
                target_job_title=target_job_title,
                target_company=target_company,
                template_name=template_name,
                is_current=True,
            )

            for order, (field, section_type, title) in enumerate(
                self.SECTION_MAPPING
            ):
                ResumeSection.objects.create(
                    version=version,
                    section_type=section_type,
                    title=title,
                    content=result[field],
                    display_order=order,
                    is_visible=True,
                )

            # Keep the parent resume's updated_at in sync with its new version.
            resume.save(update_fields=["updated_at"])

        return Response(
            {
                "message": "Resume generated and saved successfully.",
                "resume_id": resume.id,
                "resume_title": resume.title,
                "version": ResumeVersionSerializer(version).data,
                "generated_resume": result,
            },
            status=status.HTTP_201_CREATED,
        )




class ParseJobProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = serializers.Serializer(
            data=request.data
        )

        # Validate the payload explicitly below.
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        description = request.data.get("description")

        if not isinstance(description, str):
            return Response(
                {"description": ["This field must be a string."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        description = description.strip()

        if len(description) < 20:
            return Response(
                {"description": ["Enter at least 20 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(description) > 50000:
            return Response(
                {"description": ["Maximum length is 50000 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/parse-job",
                payload={"description": description},
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(result, dict):
            return Response(
                {"detail": "AI service returned an invalid response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(result, status=status.HTTP_200_OK)


class OptimizeResumeProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        candidate_resume = request.data.get("candidate_resume")
        job_description = request.data.get("job_description")
        target_job_title = request.data.get("target_job_title", "")

        if not isinstance(candidate_resume, dict) or not candidate_resume:
            return Response(
                {"candidate_resume": ["A resume JSON object is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(job_description, str):
            return Response(
                {"job_description": ["This field must be a string."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_description = job_description.strip()

        if len(job_description) < 20:
            return Response(
                {"job_description": ["Enter at least 20 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(target_job_title, str):
            return Response(
                {"target_job_title": ["This field must be a string."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/optimize-resume",
                payload={
                    "candidate_resume": candidate_resume,
                    "job_description": job_description,
                    "target_job_title": target_job_title,
                },
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(result, dict):
            return Response(
                {"detail": "AI service returned an invalid response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(result, status=status.HTTP_200_OK)


class ImproveSectionProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        section_name = request.data.get("section_name")
        section_content = request.data.get("section_content")
        job_description = request.data.get("job_description", "")
        target_job_title = request.data.get("target_job_title", "")

        if not isinstance(section_name, str) or not section_name.strip():
            return Response(
                {"section_name": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not isinstance(section_content, str)
            or not section_content.strip()
        ):
            return Response(
                {"section_content": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for field, value in (
            ("job_description", job_description),
            ("target_job_title", target_job_title),
        ):
            if not isinstance(value, str):
                return Response(
                    {field: ["This field must be a string."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if len(section_content) > 15000:
            return Response(
                {"section_content": ["Maximum length is 15000 characters."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = call_ai_service(
                endpoint="/api/v1/ai/improve-section",
                payload={
                    "section_name": section_name.strip(),
                    "section_content": section_content.strip(),
                    "job_description": job_description,
                    "target_job_title": target_job_title,
                },
            )
        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not isinstance(result, dict):
            return Response(
                {"detail": "AI service returned an invalid response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(result, status=status.HTTP_200_OK)




