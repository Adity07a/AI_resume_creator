from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from resumes.profile_payload import build_candidate_resume
from users.models import (
    Language,
    ProfileAchievement,
    TargetRolePreference,
    UserProfile,
    Skill,
)


User = get_user_model()


class CareerProfileFeatureTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile_test_user",
            email="profile_test@example.com",
            password="StrongPassword123!",
            first_name="Asha",
            last_name="Sharma",
        )

        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_combined_profile_returns_all_sections(self):
        response = self.client.get("/api/v1/profile/")

        self.assertEqual(response.status_code, 200)

        expected_keys = {
            "user",
            "profile",
            "experiences",
            "projects",
            "skills",
            "education",
            "certifications",
            "links",
            "languages",
            "achievements",
            "target_role_preferences",
            "completion",
        }

        self.assertTrue(
            expected_keys.issubset(response.data.keys())
        )

    def test_profile_completion_identifies_required_fields(self):
        response = self.client.get(
            "/api/v1/profile/completion/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "completion_percentage",
            response.data,
        )
        self.assertIn(
            "required_completion_percentage",
            response.data,
        )
        self.assertIn("fields", response.data)
        self.assertIn("sections", response.data)

        required_fields = [
            field
            for field in response.data["fields"]
            if field["required"]
        ]

        self.assertTrue(required_fields)
        self.assertTrue(
            all(field["complete"] for field in required_fields)
        )

    def test_user_can_create_language(self):
        response = self.client.post(
            "/api/v1/profile/languages/",
            {
                "name": "English",
                "proficiency": "fluent",
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Language.objects.filter(
                profile=self.profile,
                name="English",
                proficiency="fluent",
            ).exists()
        )

    def test_user_can_create_profile_achievement(self):
        response = self.client.post(
            "/api/v1/profile/achievements/",
            {
                "title": "Hackathon finalist",
                "description": "Reached the final round.",
                "organization": "Example Organization",
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            ProfileAchievement.objects.filter(
                profile=self.profile,
                title="Hackathon finalist",
            ).exists()
        )

    def test_user_can_create_target_role_preference(self):
        response = self.client.post(
            "/api/v1/profile/target-role-preferences/",
            {
                "target_role": "Backend Developer",
                "preferred_locations": ["Bhopal", "Remote"],
                "work_modes": ["remote", "hybrid"],
                "employment_types": ["full_time"],
                "industries": ["Software"],
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            TargetRolePreference.objects.filter(
                profile=self.profile,
                target_role="Backend Developer",
            ).exists()
        )

    def test_user_cannot_access_another_users_language(self):
        another_user = User.objects.create_user(
            username="another_profile_user",
            email="another_profile@example.com",
            password="StrongPassword123!",
        )

        another_profile = UserProfile.objects.create(
            user=another_user
        )

        other_language = Language.objects.create(
            profile=another_profile,
            name="French",
        )

        response = self.client.get(
            f"/api/v1/profile/languages/{other_language.pk}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_profile_mapping_includes_new_career_data(self):
        Skill.objects.create(
            profile=self.profile,
            name="Django",
            category="backend",
            proficiency="advanced",
            years_experience=Decimal("2.5"),
        )

        Language.objects.create(
            profile=self.profile,
            name="English",
            proficiency="fluent",
        )

        ProfileAchievement.objects.create(
            profile=self.profile,
            title="Hackathon finalist",
            organization="Example Organization",
        )

        TargetRolePreference.objects.create(
            profile=self.profile,
            target_role="Backend Developer",
            work_modes=["remote"],
        )

        payload = build_candidate_resume(self.user)

        self.assertEqual(
            payload["skills"][0]["years_experience"],
            2.5,
        )
        self.assertEqual(
            payload["languages"][0]["name"],
            "English",
        )
        self.assertEqual(
            payload["achievements"][0]["title"],
            "Hackathon finalist",
        )
        self.assertEqual(
            payload["target_role_preferences"][0]["target_role"],
            "Backend Developer",
        )