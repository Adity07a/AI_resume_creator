from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.

class User(AbstractUser):
    email=models.EmailField(unique=True)

    "Custom user model for AI resume creator"

    def __str__(self):
        return self.email

    

class UserProfile(models.Model):
    "Profile information that will belong to the user"
    user=models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",

    )

    phone=models.CharField(
        max_length=20,
        blank=True,
    )

    location=models.CharField(
        max_length=255,
        blank=True,
    )

    headline=models.CharField(
        max_length=255,
        blank=True,
    )

    bio=models.TextField(
        blank=True,
    )

    linked_url=models.URLField(
        blank=True,
    )

    github_url=models.URLField(
        blank=True,
    )

    portfolio_url=models.URLField(
        blank=True,
    )

    created_at=models.DateTimeField(
        auto_now_add=True,
    )

    updated_at=models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"{self.user.email}'s Profile"
