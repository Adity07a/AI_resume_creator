from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .serializers import EmailVerificationTokenObtainPairSerializer
from .views import (
    CurrentUserView,
    EmailVerificationConfirmView,
    EmailVerificationResendView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    UserProfileView,
)
from rest_framework_simplejwt.views import TokenObtainPairView


class LoginView(TokenObtainPairView):
    serializer_class = EmailVerificationTokenObtainPairSerializer


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("verify-email/resend/", EmailVerificationResendView.as_view(), name="verify-email-resend"),
    path("verify-email/confirm/", EmailVerificationConfirmView.as_view(), name="verify-email-confirm"),
]
