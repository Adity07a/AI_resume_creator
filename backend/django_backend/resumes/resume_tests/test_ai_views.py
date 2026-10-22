
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from ai_client.services import AIServiceError
from resumes.models import Resume, ResumeVersion, ResumeSection


User = get_user_model()

GENERATE_URL = "/api/v1/resumes/ai/generate-resume/"
PARSE_RESUME_URL = "/api/v1/resumes/ai/parse-resume/"

def candidate_resume():
    return {
        "personal_info": {
            "full_name": "Test Candidate",
            "email": "candidate@example.com",
        },
        "summary": "Python developer with API development experience.",
        "skills": ["Python", "Django", "SQL"],
        "experience": [],
        "projects": [],
        "education": [],
        "certifications": [],
        "achievements": [],
        "languages": [],
        "links": [],
    }


def generated_resume():
    return {
        **candidate_resume(),
        "summary": "Python developer skilled in Django and SQL.",
    }


def request_payload(**overrides):
    payload = {
        "candidate_resume": candidate_resume(),
        "job_description": (
            "We need a Python developer skilled in Django, REST APIs, "
            "SQL, testing, and problem-solving."
        ),
        "target_job_title": "Python Developer",
        "target_company": "Example Company",
        "resume_title": "Python Developer Resume",
        "template_name": "ATS Classic",
    }
    payload.update(overrides)
    return payload


class GenerateResumeAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="candidate1",
            email="candidate1@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="candidate2",
            email="candidate2@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

    @patch("resumes.ai_views.call_ai_service")
    def test_generation_persists_resume_and_sections(self, mock_ai):
        mock_ai.return_value = generated_resume()

        response = self.client.post(
            GENERATE_URL,
            request_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("resume_id", response.data)

        resume = Resume.objects.get(
            id=response.data["resume_id"],
            user=self.user,
        )
        version = ResumeVersion.objects.get(
            resume=resume,
            version_number=1,
        )

        self.assertTrue(version.is_current)
        self.assertEqual(version.target_job_title, "Python Developer")
        self.assertEqual(version.template_name, "ATS Classic")

        sections = list(version.sections.all())
        self.assertEqual(len(sections), 10)

        summary_section = version.sections.get(section_type="SUMMARY")
        self.assertEqual(
            summary_section.content,
            generated_resume()["summary"],
        )

        self.assertEqual(
            ResumeSection.objects.filter(version=version).count(),
            10,
        )

    @patch("resumes.ai_views.call_ai_service")
    def test_regeneration_creates_next_version(self, mock_ai):
        mock_ai.return_value = generated_resume()

        first_response = self.client.post(
            GENERATE_URL,
            request_payload(),
            format="json",
        )
        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        resume_id = first_response.data["resume_id"]

        second_response = self.client.post(
            GENERATE_URL,
            request_payload(resume_id=resume_id),
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(second_response.data["resume_id"], resume_id)
        self.assertEqual(
            second_response.data["version"]["version_number"],
            2,
        )

        versions = ResumeVersion.objects.filter(
            resume_id=resume_id
        ).order_by("version_number")

        self.assertEqual(versions.count(), 2)
        self.assertFalse(versions.get(version_number=1).is_current)
        self.assertTrue(versions.get(version_number=2).is_current)

    @patch("resumes.ai_views.call_ai_service")
    def test_user_cannot_generate_version_of_another_users_resume(
        self, mock_ai
    ):
        other_resume = Resume.objects.create(
            user=self.other_user,
            title="Private Resume",
        )
        ResumeVersion.objects.create(
            resume=other_resume,
            version_number=1,
            is_current=True,
        )

        response = self.client.post(
            GENERATE_URL,
            request_payload(resume_id=other_resume.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_ai.assert_not_called()

        self.assertEqual(
            Resume.objects.filter(user=self.other_user).count(),
            1,
        )
        self.assertEqual(other_resume.versions.count(), 1)

    @patch("resumes.ai_views.call_ai_service")
    def test_ai_service_failure_does_not_save_resume(self, mock_ai):
        mock_ai.side_effect = AIServiceError("AI service unavailable")

        response = self.client.post(
            GENERATE_URL,
            request_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_502_BAD_GATEWAY,
        )
        self.assertEqual(
            Resume.objects.filter(user=self.user).count(),
            0,
        )
        self.assertEqual(ResumeVersion.objects.count(), 0)
        self.assertEqual(ResumeSection.objects.count(), 0)

    def test_unauthenticated_user_cannot_generate_resume(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            GENERATE_URL,
            request_payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

class ParseResumeProxyTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="parse_user",
            email="parse_user@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

    @patch("resumes.ai_views.call_ai_service_file")
    def test_upload_returns_structured_resume(self, mock_ai):
        mock_ai.return_value = candidate_resume()

        resume_file = SimpleUploadedFile(
            "resume.txt",
            b"Candidate resume with Python and Django experience.",
            content_type="text/plain",
        )

        response = self.client.post(
            PARSE_RESUME_URL,
            {"file": resume_file},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["skills"],
            ["Python", "Django", "SQL"],
        )

        mock_ai.assert_called_once()

        self.assertEqual(
            mock_ai.call_args.kwargs["endpoint"],
            "/api/v1/ai/parse-resume",
        )

    def test_upload_rejects_unsupported_file_type(self):
        resume_file = SimpleUploadedFile(
            "resume.exe",
            b"unsupported content",
            content_type="application/octet-stream",
        )

        response = self.client.post(
            PARSE_RESUME_URL,
            {"file": resume_file},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_upload_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            PARSE_RESUME_URL,
            {},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )