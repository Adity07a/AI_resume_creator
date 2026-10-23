from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate
from unittest.mock import patch

from users.models import UserProfile
from .ai_views import GenerateResumeView

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


class ResumeGenerationSavedProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile-owner",
            email="profile-owner@example.com",
            password="Strong-pass-859!",
        )

        self.profile = UserProfile.objects.create(
            user=self.user,
            headline="Python Backend Developer",
            bio="Python developer experienced in Django and REST APIs.",
            phone="",
            location="Bhopal",
            linked_url="",
            github_url="",
            portfolio_url="",
        )

        self.factory = APIRequestFactory()

    @staticmethod
    def valid_ai_result():
        return {
            "personal_info": {
                "full_name": "profile-owner",
                "email": "profile-owner@example.com",
            },
            "summary": "Python backend developer experienced in Django.",
            "skills": [{"name": "Python"}, {"name": "Django"}],
            "experience": [],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "languages": [],
            "links": [],
        }

    def generate_resume(self, payload):
        request = self.factory.post(
            "/api/v1/resumes/generate/",
            payload,
            format="json",
        )
        force_authenticate(request, user=self.user)
        return GenerateResumeView.as_view()(request)

    @patch("resumes.ai_views.call_ai_service")
    def test_generate_resume_using_saved_profile(self, mock_call_ai):
        mock_call_ai.return_value = self.valid_ai_result()

        response = self.generate_resume({
            "use_saved_profile": True,
            "job_description": (
                "We need a Python developer experienced in Django, "
                "REST APIs, PostgreSQL, and Docker."
            ),
            "target_job_title": "Python Backend Developer",
            "target_company": "Example Company",
        })

        self.assertEqual(response.status_code, 201, response.data)

        sent_payload = mock_call_ai.call_args.kwargs["payload"]
        candidate = sent_payload["candidate_resume"]

        self.assertEqual(
            candidate["personal_info"]["headline"],
            "Python Backend Developer",
        )
        self.assertEqual(
            candidate["summary"],
            "Python developer experienced in Django and REST APIs.",
        )

        self.assertEqual(
            Resume.objects.filter(user=self.user).count(),
            1,
        )

        self.assertEqual(
            ResumeSection.objects.filter(
                version__resume__user=self.user
            ).count(),
            len(GenerateResumeView.SECTION_MAPPING),
        )

    @patch("resumes.ai_views.call_ai_service")
    def test_existing_candidate_resume_request_still_works(
        self,
        mock_call_ai,
    ):
        mock_call_ai.return_value = self.valid_ai_result()

        candidate_resume = {
            "personal_info": {"full_name": "Existing Candidate"},
            "summary": "Previously supplied resume summary.",
            "skills": [],
            "experience": [],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "languages": [],
            "links": [],
        }

        response = self.generate_resume({
            "candidate_resume": candidate_resume,
            "job_description": (
                "We need a Python developer experienced in Django "
                "and REST APIs."
            ),
            "target_job_title": "Python Developer",
        })

        self.assertEqual(response.status_code, 201, response.data)

        sent_payload = mock_call_ai.call_args.kwargs["payload"]
        self.assertEqual(
            sent_payload["candidate_resume"],
            candidate_resume,
        )

    @patch("resumes.ai_views.call_ai_service")
    def test_generation_rejects_missing_candidate_data(
        self,
        mock_call_ai,
    ):
        response = self.generate_resume({
            "job_description": (
                "We need a Python developer experienced in Django "
                "and REST APIs."
            ),
            "target_job_title": "Python Developer",
        })

        self.assertEqual(response.status_code, 400, response.data)
        mock_call_ai.assert_not_called()

