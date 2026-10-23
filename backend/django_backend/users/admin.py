from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Certification,
    Education,
    Experience,
    Language,
    ProfileAchievement,
    ProfileLink,
    Project,
    Skill,
    TargetRolePreference,
    User,
    UserProfile,
)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display=(
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
    )

    search_fields=(
        "username",
        "email",
        "first_name",
        "last_name",
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    "Django admin configuration"

    list_display=(
        "user",
        "phone",
        "location",
        "created_at",
        "updated_at",
    )

    search_fields=(
        "user__email",
        "user__username",
        "phone",
        "location",
    )

class ProfileEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "display_order", "created_at", "updated_at")
    list_select_related = ("profile", "profile__user")
    search_fields = ("profile__user__email", "profile__user__username")
    ordering = ("profile__user__email", "display_order", "id")


admin.site.register(Experience, ProfileEntryAdmin)
admin.site.register(Project, ProfileEntryAdmin)
admin.site.register(Skill, ProfileEntryAdmin)
admin.site.register(Education, ProfileEntryAdmin)
admin.site.register(Certification, ProfileEntryAdmin)
admin.site.register(ProfileLink, ProfileEntryAdmin)
admin.site.register(Language, ProfileEntryAdmin)
admin.site.register(ProfileAchievement, ProfileEntryAdmin)
admin.site.register(TargetRolePreference, ProfileEntryAdmin)