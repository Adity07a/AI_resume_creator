from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Certification, Education, Experience, ProfileLink, Project, Skill, UserProfile

User = get_user_model()


class CanonicalCareerProfileAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="career-one", email="career-one@example.com", password="Strong-Password-839!"
        )
        self.other_user = User.objects.create_user(
            username="career-two", email="career-two@example.com", password="Strong-Password-839!"
        )
        UserProfile.objects.get_or_create(user=self.user)
        UserProfile.objects.get_or_create(user=self.other_user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_all_six_resource_collections_support_create_and_list(self):
        cases = [
            ("profile-experience-list", {"company": "Example Ltd", "job_title": "Backend Developer"}),
            ("profile-project-list", {"name": "Payments API", "description": "Built an API."}),
            ("profile-skill-list", {"name": "Python", "category": "backend"}),
            ("profile-education-list", {"institution": "Example University", "degree": "BSc"}),
            ("profile-certification-list", {"name": "Example Certification"}),
            ("profile-link-list", {"label": "GitHub", "link_type": "github", "url": "https://github.com/example"}),
        ]
        for route_name, payload in cases:
            with self.subTest(route=route_name):
                response = self.client.post(reverse(route_name), payload, format="json")
                self.assertEqual(response.status_code, 201, response.data)
                self.assertNotIn("profile", response.data)
                listed = self.client.get(reverse(route_name))
                self.assertEqual(listed.status_code, 200)
                self.assertTrue(any(item["id"] == response.data["id"] for item in listed.data))

    def test_users_cannot_read_or_modify_another_users_records(self):
        profile = UserProfile.objects.get(user=self.other_user)
        foreign_experience = Experience.objects.create(
            profile=profile, company="Private Co", job_title="Private Role"
        )
        detail_url = reverse("profile-experience-detail", args=[foreign_experience.pk])
        self.assertEqual(self.client.get(detail_url).status_code, 404)
        self.assertEqual(
            self.client.patch(detail_url, {"job_title": "Changed"}, format="json").status_code,
            404,
        )
        self.assertEqual(self.client.delete(detail_url).status_code, 404)
        foreign_experience.refresh_from_db()
        self.assertEqual(foreign_experience.job_title, "Private Role")

    def test_experience_date_validation_rejects_end_before_start(self):
        response = self.client.post(
            reverse("profile-experience-list"),
            {
                "company": "Example Ltd",
                "job_title": "Backend Developer",
                "start_date": "2024-01-01",
                "end_date": "2023-12-31",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_current_role_cannot_have_end_date(self):
        response = self.client.post(
            reverse("profile-experience-list"),
            {
                "company": "Example Ltd",
                "job_title": "Backend Developer",
                "currently_working": True,
                "end_date": "2025-01-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("end_date", response.data)

    def test_skills_reject_unknown_category_and_negative_years(self):
        bad_category = self.client.post(
            reverse("profile-skill-list"), {"name": "Python", "category": "magic"}, format="json"
        )
        self.assertEqual(bad_category.status_code, 400)
        bad_years = self.client.post(
            reverse("profile-skill-list"), {"name": "Python", "category": "backend", "years_experience": "-1.0"}, format="json"
        )
        self.assertEqual(bad_years.status_code, 400)

    def test_career_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("profile-project-list"))
        self.assertEqual(response.status_code, 401)
