
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from resumes.models import Resume, ResumeVersion, ResumeSection


User = get_user_model()


class ResumeVersionEditingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="version_user",
            email="version_user@example.com",
            password="StrongPassword123!",
        )
        self.other_user = User.objects.create_user(
            username="other_version_user",
            email="other_user@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

        self.resume = Resume.objects.create(
            user=self.user,
            title="Python Developer Resume",
        )
        self.version = ResumeVersion.objects.create(
            resume=self.resume,
            version_number=1,
            is_current=True,
        )
        self.summary = ResumeSection.objects.create(
            version=self.version,
            section_type="SUMMARY",
            title="Professional Summary",
            content="Original summary",
        )

        self.other_resume = Resume.objects.create(
            user=self.other_user,
            title="Private Resume",
        )
        self.other_version = ResumeVersion.objects.create(
            resume=self.other_resume,
            version_number=1,
            is_current=True,
        )
        self.other_section = ResumeSection.objects.create(
            version=self.other_version,
            section_type="SUMMARY",
            title="Private Summary",
            content="Private content",
        )

    def test_retrieve_specific_version_with_sections(self):
        url = (
            f"/api/v1/resumes/{self.resume.id}/"
            f"versions/{self.version.id}/"
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.version.id)
        self.assertEqual(len(response.data["sections"]), 1)
        self.assertEqual(
            response.data["sections"][0]["content"],
            "Original summary",
        )

    def test_cannot_retrieve_another_users_resume_version(self):
        url = (
            f"/api/v1/resumes/{self.other_resume.id}/"
            f"versions/{self.other_version.id}/"
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_owner_can_edit_section(self):
        url = f"/api/v1/resume-sections/{self.summary.id}/"

        response = self.client.patch(
            url,
            {"content": "Updated Python developer summary"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.summary.refresh_from_db()
        self.assertEqual(
            self.summary.content,
            "Updated Python developer summary",
        )

    def test_cannot_edit_another_users_section(self):
        url = f"/api/v1/resume-sections/{self.other_section.id}/"

        response = self.client.patch(
            url,
            {"content": "Unauthorized change"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.other_section.refresh_from_db()
        self.assertEqual(
            self.other_section.content,
            "Private content",
        )
