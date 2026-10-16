import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.crypto import constant_time_compare
from django.utils.encoding import force_bytes

from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile
from .serializers import UserProfileSerializer, UserRegistrationSerializer

User = get_user_model()
logger = logging.getLogger(__name__)
EMAIL_SIGNER_SALT = "users.email-verification.v1"


def _send_verification_email(user):
    signer = TimestampSigner(salt=EMAIL_SIGNER_SALT)
    token = signer.sign(f"{user.pk}:{user.email}")
    verification_url = (
        f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?"
        f"{urlencode({'token': token})}"
    )
    try:
        return send_mail(
            subject="Verify your AI Resume Creator email",
            message=(
                f"Hi {user.first_name or user.username},\n\n"
                "Please open this link to verify your email address. "
                f"The link expires in {settings.EMAIL_VERIFICATION_TOKEN_MAX_AGE // 3600} hours.\n\n"
                f"{verification_url}\n\nIf you did not create this account, ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        ) == 1
    except Exception:
        # Do not fail account creation if the SMTP provider is temporarily unavailable.
        logger.exception("Could not send email verification to user id=%s", user.pk)
        return False


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        email_sent = _send_verification_email(user)
        return Response(
            {
                "message": "Registration successful. Check your email for verification.",
                "email_verification_email_sent": email_sent,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_email_verified": user.is_email_verified,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_email_verified": user.is_email_verified,
        })


class UserProfileView(APIView):
    """Read/update the authenticated user's own profile and basic name fields."""
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _payload(user, profile):
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_email_verified": user.is_email_verified,
            },
            "profile": UserProfileSerializer(profile).data,
        }

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(self._payload(request.user, profile))

    @transaction.atomic
    def put(self, request):
        return self._update(request)

    @transaction.atomic
    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        allowed = {
            "phone", "location", "headline", "bio", "linked_url",
            "github_url", "portfolio_url", "first_name", "last_name",
        }
        unknown = set(request.data.keys()) - allowed
        if unknown:
            raise ValidationError({"fields": f"Unsupported fields: {', '.join(sorted(unknown))}"})

        profile_fields = {
            key: value for key, value in request.data.items()
            if key in {
                "phone", "location", "headline", "bio", "linked_url",
                "github_url", "portfolio_url",
            }
        }
        serializer = UserProfileSerializer(profile, data=profile_fields, partial=True)
        serializer.is_valid(raise_exception=True)

        for field in ("first_name", "last_name"):
            if field in request.data:
                value = request.data[field]
                if not isinstance(value, str):
                    raise ValidationError({field: "Must be text."})
                if len(value) > 150:
                    raise ValidationError({field: "Must be 150 characters or fewer."})
                setattr(user, field, value.strip())

        serializer.save()
        if "first_name" in request.data or "last_name" in request.data:
            user.save(update_fields=["first_name", "last_name"])
        return Response(self._payload(user, profile))


class LogoutView(APIView):
    """Blacklist the authenticated user's refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_token = request.data.get("refresh")
        if not raw_token:
            raise ValidationError({"refresh": "Refresh token is required."})
        try:
            token = RefreshToken(raw_token)
            if str(token.get("user_id")) != str(request.user.pk):
                return Response({"detail": "Token does not belong to this user."}, status=403)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired refresh token."}, status=400)
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_205_RESET_CONTENT)


class PasswordResetRequestView(APIView):
    """Request a reset link. Response does not disclose whether an email exists."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            raise ValidationError({"email": "Email is required."})
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/?"
                f"{urlencode({'uid': uid, 'token': token})}"
            )
            try:
                send_mail(
                    subject="Reset your AI Resume Creator password",
                    message=(
                        "A password reset was requested for your account.\n\n"
                        f"Open this link to set a new password:\n{reset_url}\n\n"
                        "If you did not request this, ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception("Could not send password reset email to user id=%s", user.pk)
        return Response({
            "detail": "If an active account matches that email, a reset link has been sent."
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        if not uidb64 or not token or not new_password:
            raise ValidationError({"detail": "uid, token, and new_password are required."})

        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired reset link."}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=400)

        try:
            validate_password(new_password, user=user)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError
            if isinstance(exc, DjangoValidationError):
                raise ValidationError({"new_password": list(exc.messages)})
            raise

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password has been reset successfully."})

class EmailVerificationResendView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()

        if not email:
            raise ValidationError({
                "email": "Email is required."
            })

        user = User.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()

        if user and not user.is_email_verified:
            # The helper logs delivery errors without exposing
            # whether the email address belongs to an account.
            _send_verification_email(user)

        # Use the same response whether the account exists or not.
        return Response({
            "detail": (
                "If an active unverified account matches that email, "
                "a verification email will be sent."
            )
        })

class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return self._confirm(request.query_params.get("token"))

    def post(self, request):
        return self._confirm(request.data.get("token"))

    def _confirm(self, token):
        if not token:
            raise ValidationError({"token": "Verification token is required."})
        signer = TimestampSigner(salt=EMAIL_SIGNER_SALT)
        try:
            payload = signer.unsign(
                token,
                max_age=settings.EMAIL_VERIFICATION_TOKEN_MAX_AGE,
            )
            user_id, email = payload.split(":", 1)
            user = User.objects.get(pk=user_id, email__iexact=email, is_active=True)
        except (BadSignature, SignatureExpired, ValueError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired verification link."}, status=400)

        if not user.is_email_verified:
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])
        return Response({"detail": "Email verified successfully."})
