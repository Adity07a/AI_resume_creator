from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:5173",
    PUBLIC_API_BASE_URL="http://testserver",
)
class AuthAndProfileWorkflowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile-user",
            email="profile@example.com",
            password="Old-Strong-Password-839!",
        )

    def test_profile_can_be_read_and_updated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, 200)
        response = self.client.patch(
            reverse("profile"),
            {"location": "Bhopal", "headline": "AI Engineer", "first_name": "Aditi"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["location"], "Bhopal")
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Aditi")

    def test_registration_sends_verification_email_and_link_works(self):
        response = self.client.post(reverse("register"), {
            "username": "new-user",
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "Strong-Password-839!",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        link = next(
            part for part in mail.outbox[0].body.split()
            if "verify-email/confirm/?token=" in part
        )
        token = parse_qs(urlsplit(link).query)["token"][0]
        response = self.client.get(reverse("verify-email-confirm"), {"token": token})
        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="new@example.com")
        self.assertTrue(user.is_email_verified)

    def test_password_reset_link_changes_password(self):
        response = self.client.post(reverse("password-reset-request"), {
            "email": self.user.email,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = next(
            part for part in mail.outbox[0].body.split()
            if "/reset-password/?" in part
        )
        params = parse_qs(urlsplit(link).query)
        response = self.client.post(reverse("password-reset-confirm"), {
            "uid": params["uid"][0],
            "token": params["token"][0],
            "new_password": "New-Strong-Password-839!",
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New-Strong-Password-839!"))

    def test_logout_blacklists_refresh_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = str(RefreshToken.for_user(self.user))
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("logout"), {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 205)
        self.client.force_authenticate(user=None)
        response = self.client.post(reverse("token_refresh"), {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 401)
