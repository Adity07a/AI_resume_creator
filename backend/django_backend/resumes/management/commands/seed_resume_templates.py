from django.core.management.base import BaseCommand

from resumes.models import ResumeTemplate


TEMPLATES = [
    {
        "slug": "classic",
        "name": "ATS Classic",
        "description": "Simple, readable, single-column resume.",
        "category": "ats_friendly",
        "is_ats_friendly": True,
        "display_order": 1,
        "layout_config": {
            "layout": "single-column",
            "font_family": "Arial",
            "accent_color": "#1F2937",
            "section_order": [
                "summary",
                "skills",
                "experience",
                "projects",
                "education",
                "certifications",
            ],
        },
    },
    {
        "slug": "professional",
        "name": "Professional",
        "description": "Traditional professional layout.",
        "category": "professional",
        "is_ats_friendly": True,
        "display_order": 2,
        "layout_config": {
            "layout": "single-column",
            "font_family": "Calibri",
            "accent_color": "#1D4ED8",
        },
    },
    {
        "slug": "modern",
        "name": "Modern",
        "description": "Contemporary layout with a two-column design.",
        "category": "modern",
        "is_ats_friendly": False,
        "display_order": 3,
        "layout_config": {
            "layout": "two-column",
            "font_family": "Arial",
            "accent_color": "#0F766E",
        },
    },
    {
        "slug": "minimal",
        "name": "Minimal",
        "description": "Clean layout with restrained styling.",
        "category": "minimal",
        "is_ats_friendly": True,
        "display_order": 4,
        "layout_config": {
            "layout": "single-column",
            "font_family": "Arial",
            "accent_color": "#374151",
        },
    },
    {
        "slug": "technical",
        "name": "Technical",
        "description": "Structured layout for technical candidates.",
        "category": "technical",
        "is_ats_friendly": True,
        "display_order": 5,
        "layout_config": {
            "layout": "single-column",
            "font_family": "Calibri",
            "accent_color": "#6D28D9",
        },
    },
    {
        "slug": "executive",
        "name": "Executive",
        "description": "Formal layout for senior and leadership roles.",
        "category": "executive",
        "is_ats_friendly": True,
        "display_order": 6,
        "layout_config": {
            "layout": "single-column",
            "font_family": "Georgia",
            "accent_color": "#7C2D12",
        },
    },
]


class Command(BaseCommand):
    help = "Create or update the default resume template catalog."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for item in TEMPLATES:
            _, created = ResumeTemplate.objects.update_or_create(
                slug=item["slug"],
                defaults=item,
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Template catalog ready. "
                f"Created: {created_count}; updated: {updated_count}."
            )
        )