from users.models import UserProfile


def _date_value(value):
    """Serialize optional dates consistently for the AI request."""
    return value.isoformat() if value else ""


def build_candidate_resume(user):
    """
    Convert the canonical career profile into a structured AI input.

    All factual career data is read from saved profile records.
    This function does not update or rewrite the source profile.
    """

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = None

    personal_info = {
        "full_name": user.get_full_name() or user.username,
        "email": user.email,
        "phone": "",
        "location": "",
        "headline": "",
        "linkedin": "",
        "github": "",
        "portfolio": "",
    }

    empty_payload = {
        "personal_info": personal_info,
        "summary": "",
        "skills": [],
        "experience": [],
        "projects": [],
        "education": [],
        "certifications": [],
        "achievements": [],
        "languages": [],
        "links": [],
        "target_role_preferences": [],
    }

    if profile is None:
        return empty_payload

    experiences = profile.experiences.all().order_by(
        "display_order", "id"
    )

    projects = profile.projects.all().order_by(
        "display_order", "id"
    )

    skills = profile.skills.all().order_by(
        "display_order", "id"
    )

    education = profile.education_entries.all().order_by(
        "display_order", "id"
    )

    certifications = profile.certifications.all().order_by(
        "display_order", "id"
    )

    links = profile.links.all().order_by(
        "display_order", "id"
    )

    languages = profile.languages.all().order_by(
        "display_order", "id"
    )

    achievements = profile.achievements.all().order_by(
        "display_order", "id"
    )

    target_roles = profile.target_role_preferences.all().order_by(
        "display_order", "id"
    )

    personal_info.update(
        {
            "phone": profile.phone or "",
            "location": profile.location or "",
            "headline": profile.headline or "",
            "linkedin": profile.linked_url or "",
            "github": profile.github_url or "",
            "portfolio": profile.portfolio_url or "",
        }
    )

    return {
        "personal_info": personal_info,

        "summary": profile.bio or "",

        "skills": [
            {
                "name": item.name,
                "category": item.category,
                "proficiency": item.proficiency,
                "years_experience": (
                    float(item.years_experience)
                    if item.years_experience is not None
                    else None
                ),
            }
            for item in skills
        ],

        "experience": [
            {
                "company": item.company,
                "job_title": item.job_title,
                "location": item.location or "",
                "start_date": _date_value(item.start_date),
                "end_date": _date_value(item.end_date),
                "currently_working": item.currently_working,
                "description": item.description or "",
                "achievements": item.achievements or [],
                "technologies": item.technologies or [],
                "domain_tags": item.domain_tags or [],
            }
            for item in experiences
        ],

        "projects": [
            {
                "name": item.name,
                "role": item.role or "",
                "description": item.description or "",
                "technologies": item.technologies or [],
                "achievements": item.achievements or [],
                "project_url": item.project_url or "",
                "start_date": _date_value(item.start_date),
                "end_date": _date_value(item.end_date),
            }
            for item in projects
        ],

        "education": [
            {
                "institution": item.institution,
                "degree": item.degree,
                "field_of_study": item.field_of_study or "",
                "location": item.location or "",
                "start_date": _date_value(item.start_date),
                "end_date": _date_value(item.end_date),
                "currently_studying": item.currently_studying,
                "grade": item.grade or "",
                "description": item.description or "",
            }
            for item in education
        ],

        "certifications": [
            {
                "name": item.name,
                "issuing_organization": (
                    item.issuing_organization or ""
                ),
                "issue_date": _date_value(item.issue_date),
                "expiration_date": _date_value(
                    item.expiration_date
                ),
                "does_not_expire": item.does_not_expire,
                "credential_id": item.credential_id or "",
                "credential_url": item.credential_url or "",
            }
            for item in certifications
        ],

        "achievements": [
            {
                "title": item.title,
                "description": item.description or "",
                "organization": item.organization or "",
                "achieved_on": _date_value(item.achieved_on),
            }
            for item in achievements
        ] + [
            achievement
            for item in experiences
            for achievement in (item.achievements or [])
        ] + [
            achievement
            for item in projects
            for achievement in (item.achievements or [])
        ],

        "languages": [
            {
                "name": item.name,
                "proficiency": item.proficiency,
            }
            for item in languages
        ],

        "links": [
            {
                "label": item.label,
                "link_type": item.link_type,
                "url": item.url,
            }
            for item in links
        ],

        "target_role_preferences": [
            {
                "target_role": item.target_role,
                "preferred_locations": (
                    item.preferred_locations or []
                ),
                "work_modes": item.work_modes or [],
                "employment_types": (
                    item.employment_types or []
                ),
                "industries": item.industries or [],
                "notes": item.notes or "",
            }
            for item in target_roles
        ],
    }