
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from resumes.models import Resume, ResumeVersion, ResumeSection


class ResumeExportTests(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.user = User.objects.create_user(
            username="export_user",
            email="export_user@example.com",
            password="TestPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="other_export_user",
            email="other_export_user@example.com",
            password="TestPassword123!",
        )

        self.resume = Resume.objects.create(
            user=self.user,
            title="Export Test Resume",
        )

        self.version = ResumeVersion.objects.create(
            resume=self.resume,
            version_number=1,
            target_job_title="Python Developer",
            target_company="Test Company",
            template_name="ATS Classic",
            is_current=True,
        )

        ResumeSection.objects.create(
            version=self.version,
            section_type="SUMMARY",
            title="Professional Summary",
            content={
                "text": (
                    "Python developer with knowledge of "
                    "Django, REST APIs, and SQL."
                )
            },
            display_order=1,
            is_visible=True,
        )

        self.export_url = (
            f"/api/v1/resumes/{self.resume.id}/export/"
        )

        self.client.force_authenticate(user=self.user)

    def test_export_pdf(self):
        response = self.client.get(
            self.export_url,
            {"file_format": "pdf"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response["Content-Type"],
            "application/pdf",
        )
        self.assertIn(
            ".pdf",
            response["Content-Disposition"],
        )

    def test_export_docx(self):
        response = self.client.get(
            self.export_url,
            {"file_format": "docx"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument."
            "wordprocessingml.document",
        )
        self.assertIn(
            ".docx",
            response["Content-Disposition"],
        )

    def test_export_specific_version(self):
        response = self.client.get(
            self.export_url,
            {
                "file_format": "pdf",
                "version_id": self.version.id,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_unsupported_export_format(self):
        response = self.client.get(
            self.export_url,
            {"file_format": "txt"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_cannot_export_another_users_resume(self):
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(
            self.export_url,
            {"file_format": "pdf"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
