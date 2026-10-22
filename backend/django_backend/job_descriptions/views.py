from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from ai_client.services import AIServiceError, call_ai_service
from .models import JobDescription
from .serializers import JobDescriptionSerializer
from .services import (
    MAX_FILE_SIZE,
    MAX_JOB_TEXT_LENGTH,
    extract_job_text_from_file,
    extract_job_text_from_url,
)


class JobDescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = JobDescriptionSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "job_descriptions"

    def get_queryset(self):
        # Users can only access their own job descriptions.
        return JobDescription.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(
        detail=False,
        methods=["post"],
        url_path="import",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def import_job_description(self, request):
        """
        POST multipart/form-data: file=<PDF/DOCX/TXT>
        POST JSON: {"url": "https://public.example/jobs/123"}
        POST JSON: {"description": "Full job description text"}

        Optional metadata: title, job_title, company_name.
        Extracts text, parses with the AI service, and saves the record.
        """
        uploaded_file = request.FILES.get("file")
        url = request.data.get("url", "")
        description_input = request.data.get("description", "")

        if not isinstance(url, str):
            return Response(
                {"url": ["URL must be a string."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(description_input, str):
            return Response(
                {"description": ["Description must be a string."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        url = url.strip()
        description_input = description_input.strip()

        # Only one source may be supplied per import request.
        source_count = (
            int(uploaded_file is not None)
            + int(bool(url))
            + int(bool(description_input))
        )

        if source_count != 1:
            return Response(
                {
                    "detail": (
                        "Provide exactly one source: file, url, "
                        "or description."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        metadata = {}

        for field in ("title", "company_name", "job_title"):
            value = request.data.get(field, "") or ""

            if not isinstance(value, str):
                return Response(
                    {field: ["This field must be a string."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            value = value.strip()

            if len(value) > 255:
                return Response(
                    {field: ["Maximum length is 255 characters."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            metadata[field] = value

        source_type = "text"
        source_url = ""
        page_title = ""

        try:
            if uploaded_file is not None:
                if uploaded_file.size > MAX_FILE_SIZE:
                    return Response(
                        {"file": ["Maximum upload size is 5 MB."]},
                        status=413,
                    )

                # Read no more than the limit plus one byte.
                content = uploaded_file.read(MAX_FILE_SIZE + 1)

                if len(content) > MAX_FILE_SIZE:
                    return Response(
                        {"file": ["Maximum upload size is 5 MB."]},
                        status=413,
                    )

                filename = (
                    (uploaded_file.name or "")
                    .replace("\\", "/")
                    .rsplit("/", 1)[-1]
                )

                description = extract_job_text_from_file(
                    filename,
                    content,
                )
                source_type = "file"

            elif url:
                (
                    description,
                    page_title,
                    source_url,
                ) = extract_job_text_from_url(url)

                source_type = "url"

            else:
                description = description_input

            description = description.strip()

            if len(description) < 20:
                return Response(
                    {
                        "description": [
                            "Enter at least 20 characters of job text."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(description) > MAX_JOB_TEXT_LENGTH:
                return Response(
                    {
                        "description": [
                            "Maximum description length is 50000 characters."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use the existing authenticated FastAPI -> Ollama parse endpoint.
        try:
            parsed_data = call_ai_service(
                endpoint="/api/v1/ai/parse-job",
                payload={"description": description},
            )

        except AIServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=(
                    exc.status_code
                    or status.HTTP_502_BAD_GATEWAY
                ),
            )

        if not isinstance(parsed_data, dict):
            return Response(
                {"detail": "The AI service returned an invalid response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        parsed_job_title = parsed_data.get("job_title")
        parsed_company_name = parsed_data.get("company_name")

        if not isinstance(parsed_job_title, str):
            parsed_job_title = ""

        if not isinstance(parsed_company_name, str):
            parsed_company_name = ""

        job_title = (
            metadata["job_title"]
            or parsed_job_title.strip()
            or "Not specified"
        )[:255]

        company_name = (
            metadata["company_name"]
            or parsed_company_name.strip()
        )[:255]

        title = (
            metadata["title"]
            or page_title
            or job_title
            or "Imported Job Description"
        )[:255]

        # Save the extracted source and structured AI output together.
        job_description = JobDescription.objects.create(
            user=request.user,
            title=title,
            company_name=company_name,
            job_title=job_title,
            description=description,
            source_type=source_type,
            source_url=source_url,
            parsed_data=parsed_data,
        )

        return Response(
            JobDescriptionSerializer(job_description).data,
            status=status.HTTP_201_CREATED,
        )