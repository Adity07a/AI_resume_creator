from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from .models import Resume, ResumeSection, ResumeVersion

User = get_user_model()


class ResumeVersionAndSectionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="resume-owner", email="owner@example.com", password="Strong-pass-859!"
        )
        self.other_user = User.objects.create_user(
            username="other-owner", email="other@example.com", password="Strong-pass-859!"
        )
        self.client.force_authenticate(user=self.user)
        self.resume = Resume.objects.create(user=self.user, title="Backend Resume")
        self.version1 = ResumeVersion.objects.create(
            resume=self.resume, version_number=1, is_current=True,
            target_job_title="Python Developer", template_name="ATS Classic",
        )
        self.section1 = ResumeSection.objects.create(
            version=self.version1, section_type="SKILLS", title="Skills",
            content={"text": "Python, SQL"}, display_order=0,
        )

    def test_version_creation_restore_and_history(self):
        response = self.client.post(
            f"/api/v1/resumes/{self.resume.pk}/versions/",
            {"target_job_title": "AI Engineer", "target_company": "Example Co"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        version2_id = response.data["id"]
        self.version1.refresh_from_db()
        self.assertFalse(self.version1.is_current)

        response = self.client.post(
            f"/api/v1/resumes/{self.resume.pk}/versions/{self.version1.pk}/restore/",
            {}, format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["version_number"], 3)
        self.assertEqual(len(response.data["sections"]), 1)

        response = self.client.get(f"/api/v1/resumes/{self.resume.pk}/")
        self.assertEqual(response.status_code, 200)
        version_numbers = {item["version_number"] for item in response.data["versions"]}
        self.assertEqual(version_numbers, {1, 2, 3})
        self.assertNotEqual(version2_id, response.data["versions"][0]["id"])

    def test_section_update_delete_and_reorder(self):
        second = ResumeSection.objects.create(
            version=self.version1, section_type="PROJECTS", title="Projects",
            content={"text": "Resume project"}, display_order=1,
        )
        response = self.client.patch(
            f"/api/v1/resume-sections/{self.section1.pk}/",
            {"title": "Technical Skills", "is_visible": False}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.section1.refresh_from_db()
        self.assertEqual(self.section1.title, "Technical Skills")
        self.assertFalse(self.section1.is_visible)

        response = self.client.post(
            "/api/v1/resume-sections/reorder/",
            {"version_id": self.version1.pk, "section_ids": [second.pk, self.section1.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([row["id"] for row in response.data], [second.pk, self.section1.pk])

        response = self.client.delete(f"/api/v1/resume-sections/{second.pk}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ResumeSection.objects.filter(pk=second.pk).exists())

    def test_user_cannot_access_or_delete_another_users_resume_or_section(self):
        foreign_resume = Resume.objects.create(user=self.other_user, title="Private Resume")
        foreign_version = ResumeVersion.objects.create(
            resume=foreign_resume, version_number=1, is_current=True,
        )
        foreign_section = ResumeSection.objects.create(
            version=foreign_version, section_type="SKILLS", title="Private Skills",
            content={"text": "Secret"},
        )
        self.assertEqual(self.client.get(f"/api/v1/resumes/{foreign_resume.pk}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/v1/resumes/{foreign_resume.pk}/").status_code, 404)
        self.assertEqual(self.client.patch(
            f"/api/v1/resume-sections/{foreign_section.pk}/",
            {"title": "Hacked"}, format="json",
        ).status_code, 404)
        self.assertTrue(Resume.objects.filter(pk=foreign_resume.pk).exists())
        self.assertTrue(ResumeSection.objects.filter(pk=foreign_section.pk).exists())
