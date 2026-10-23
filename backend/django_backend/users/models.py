from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """Additional profile information belonging to one user."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    headline = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    linked_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s Profile"


class Experience(models.Model):
    """A factual employment or internship record owned by a profile."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="experiences"
    )
    company = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    currently_working = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    achievements = models.JSONField(default=list, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    domain_tags = models.JSONField(default=list, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.job_title} at {self.company}"


class Project(models.Model):
    """A project record that can be reused across generated resumes."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    technologies = models.JSONField(default=list, blank=True)
    achievements = models.JSONField(default=list, blank=True)
    project_url = models.URLField(max_length=2048, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.name


class Skill(models.Model):
    """A reusable skill, grouped for profile and resume presentation."""

    class Category(models.TextChoices):
        BACKEND = "backend", "Backend"
        FRONTEND = "frontend", "Frontend"
        CLOUD = "cloud", "Cloud"
        AI = "ai", "AI / Machine Learning"
        DATABASE = "database", "Database"
        DEVOPS = "devops", "DevOps"
        TESTING = "testing", "Testing"
        TOOLS = "tools", "Tools"
        SOFT_SKILLS = "soft_skills", "Soft Skills"
        OTHER = "other", "Other"

    class Proficiency(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"
        EXPERT = "expert", "Expert"

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="skills"
    )
    name = models.CharField(max_length=120)
    category = models.CharField(
        max_length=30, choices=Category.choices, default=Category.OTHER
    )
    proficiency = models.CharField(
        max_length=20, choices=Proficiency.choices, blank=True
    )
    years_experience = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class Education(models.Model):
    """A formal education entry belonging to a user's career profile."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="education_entries"
    )
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    field_of_study = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    currently_studying = models.BooleanField(default=False)
    grade = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.degree} - {self.institution}"


class Certification(models.Model):
    """A certification or professional credential held by the user."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="certifications"
    )
    name = models.CharField(max_length=255)
    issuing_organization = models.CharField(max_length=255, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    does_not_expire = models.BooleanField(default=False)
    credential_id = models.CharField(max_length=255, blank=True)
    credential_url = models.URLField(max_length=2048, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.name


class ProfileLink(models.Model):
    """An additional professional or portfolio link on the career profile."""

    class LinkType(models.TextChoices):
        LINKEDIN = "linkedin", "LinkedIn"
        GITHUB = "github", "GitHub"
        PORTFOLIO = "portfolio", "Portfolio"
        PERSONAL_WEBSITE = "personal_website", "Personal Website"
        OTHER = "other", "Other"

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="links"
    )
    label = models.CharField(max_length=100)
    link_type = models.CharField(
        max_length=30, choices=LinkType.choices, default=LinkType.OTHER
    )
    url = models.URLField(max_length=2048)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.label} ({self.profile.user.email})"

class Language(models.Model):
    """A language the user can truthfully list on their resume."""

    class Proficiency(models.TextChoices):
        NATIVE = "native", "Native"
        FLUENT = "fluent", "Fluent"
        PROFESSIONAL = "professional", "Professional"
        CONVERSATIONAL = "conversational", "Conversational"
        BASIC = "basic", "Basic"

    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="languages",
    )

    name = models.CharField(max_length=100)

    proficiency = models.CharField(
        max_length=30,
        choices=Proficiency.choices,
        blank=True,
        default="",
    )

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile", "name"],
                name="unique_profile_language",
            )
        ]

    def __str__(self):
        return self.name


class ProfileAchievement(models.Model):
    """
    An achievement belonging to the user's career profile,
    independent of any particular employment or project entry.
    """

    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="achievements",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organization = models.CharField(max_length=255, blank=True)

    achieved_on = models.DateField(null=True, blank=True)

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.title


class TargetRolePreference(models.Model):
    """
    A preferred role and its search preferences.

    Multiple records allow users to target more than one type of role.
    These preferences guide resume tailoring; they are not qualifications.
    """

    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="target_role_preferences",
    )

    target_role = models.CharField(max_length=255)

    preferred_locations = models.JSONField(
        default=list,
        blank=True,
    )

    work_modes = models.JSONField(
        default=list,
        blank=True,
    )

    employment_types = models.JSONField(
        default=list,
        blank=True,
    )

    industries = models.JSONField(
        default=list,
        blank=True,
    )

    notes = models.TextField(blank=True)

    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.target_role

    
