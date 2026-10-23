def calculate_profile_completion(profile):
    """
    Calculate profile completion without treating optional career
    sections as mandatory.

    The overall percentage includes optional items in its denominator.
    A separate required percentage makes mandatory-field completion clear.
    """

    user = profile.user

    fields = [
        {
            "key": "full_name",
            "label": "Full name",
            "required": True,
            "complete": bool(
                user.first_name.strip()
                and user.last_name.strip()
            ),
        },
        {
            "key": "email",
            "label": "Email address",
            "required": True,
            "complete": bool(user.email.strip()),
        },
        {
            "key": "phone",
            "label": "Phone number",
            "required": False,
            "complete": bool(profile.phone.strip()),
        },
        {
            "key": "location",
            "label": "Location",
            "required": False,
            "complete": bool(profile.location.strip()),
        },
        {
            "key": "headline",
            "label": "Professional headline",
            "required": False,
            "complete": bool(profile.headline.strip()),
        },
        {
            "key": "summary",
            "label": "Professional summary",
            "required": False,
            "complete": bool(profile.bio.strip()),
        },
        {
            "key": "linkedin",
            "label": "LinkedIn URL",
            "required": False,
            "complete": bool(profile.linked_url.strip()),
        },
        {
            "key": "github",
            "label": "GitHub URL",
            "required": False,
            "complete": bool(profile.github_url.strip()),
        },
        {
            "key": "portfolio",
            "label": "Portfolio URL",
            "required": False,
            "complete": bool(profile.portfolio_url.strip()),
        },
    ]

    section_definitions = [
        ("experiences", "Experience", "experiences"),
        ("projects", "Projects", "projects"),
        ("skills", "Skills", "skills"),
        ("education", "Education", "education_entries"),
        ("certifications", "Certifications", "certifications"),
        ("links", "Professional links", "links"),
        ("languages", "Languages", "languages"),
        ("achievements", "Achievements", "achievements"),
        (
            "target_role_preferences",
            "Target-role preferences",
            "target_role_preferences",
        ),
    ]

    sections = []

    for key, label, related_name in section_definitions:
        item_count = getattr(profile, related_name).count()

        sections.append(
            {
                "key": key,
                "label": label,
                "required": False,
                "complete": item_count > 0,
                "item_count": item_count,
            }
        )

    all_items = fields + sections

    completed_count = sum(
        1 for item in all_items if item["complete"]
    )

    total_count = len(all_items)

    required_fields = [
        item for item in fields if item["required"]
    ]

    completed_required = sum(
        1 for item in required_fields if item["complete"]
    )

    required_count = len(required_fields)

    completion_percentage = round(
        completed_count / total_count * 100
    ) if total_count else 100

    required_completion_percentage = round(
        completed_required / required_count * 100
    ) if required_count else 100

    return {
        "completion_percentage": completion_percentage,
        "required_completion_percentage": (
            required_completion_percentage
        ),
        "required_fields_complete": all(
            item["complete"] for item in required_fields
        ),
        "completed_count": completed_count,
        "total_count": total_count,
        "fields": fields,
        "sections": sections,
    }