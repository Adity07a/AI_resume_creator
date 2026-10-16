from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers # type: ignore
from .models import UserProfile
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

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


class EmailVerificationTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Optionally require email verification before issuing JWTs."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if (
            getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False)
            and not self.user.is_email_verified
        ):
            raise AuthenticationFailed(
                "Verify your email address before logging in.",
                code="email_not_verified",
            )
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

    