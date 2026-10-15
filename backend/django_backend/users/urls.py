from django.urls import path
from .views import RegisterView, CurrentUserView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path("register/",RegisterView.as_view(),name="register"),

     # JWT login: returns access and refresh tokens
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),

    path("me/", CurrentUserView.as_view(), name="current-user"),

    # Refresh an expired access token
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

