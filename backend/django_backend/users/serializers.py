from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers # type: ignore
from .models import UserProfile
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.settings import api_settings


User=get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password=serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type":"password"},
    )

    class Meta:
        model=User
        fields=[
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
        ]
        read_only_fields=["id"]

    def validate_email(self,value):
        return value.lower().strip()

    def create(self,validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.get_or_create(user=user)
        return user

class EmailVerificationTokenObtainPairSerializer(
    TokenObtainPairSerializer
):
    """Log in with email and password, requiring email verification."""

    # React sends {"email": "...", "password": "..."}.
    username_field = "email"

    def validate(self, attrs):
        email = str(attrs.get("email", "")).strip().lower()
        password = attrs.get("password", "")

        user = User.objects.filter(
            email__iexact=email
        ).first()

        # Use the same error for invalid credentials.
        if (
            user is None
            or not user.is_active
            or not user.check_password(password)
        ):
            raise AuthenticationFailed(
                "Invalid email or password.",
                code="no_active_account",
            )

        # Do not issue tokens before verification.
        if (
            getattr(settings, "REQUIRE_EMAIL_VERIFICATION", True)
            and not user.is_email_verified
        ):
            raise AuthenticationFailed(
                "Please verify your email address before logging in.",
                code="email_not_verified",
            )

        self.user = user
        refresh = self.get_token(user)

        data = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return data

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "phone",
            "location",
            "headline",
            "bio",
            "linked_url",
            "github_url",
            "portfolio_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    