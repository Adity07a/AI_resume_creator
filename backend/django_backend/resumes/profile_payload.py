
from users.models import UserProfile


def build_candidate_resume(user):
    """
    Convert the authenticated user's saved career profile into the
    candidate_resume structure consumed by the AI resume-generation API.
    """
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = None

    if profile is None:
        return {
            "personal_info": {
                "full_name": user.get_full_name() or user.username,
                "email": user.email,
            },
            "summary": "",
            "skills": [],
            "experience": [],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "languages": [],
            "links": [],
        }

    experiences = profile.experiences.all().order_by(
        "display_order", "start_date"
    )
    projects = profile.projects.all().order_by("display_order", "start_date")
    skills = profile.skills.all().order_by("display_order", "name")
    education = profile.education_entries.all().order_by(
        "display_order", "start_date"
    )
    certifications = profile.certifications.all().order_by(
        "display_order", "name"
    )
    links = profile.links.all().order_by("display_order", "label")

    return {
        "personal_info": {
            "full_name": user.get_full_name() or user.username,
            "email": user.email,
            "phone": profile.phone or "",
            "location": profile.location or "",
            "headline": profile.headline or "",
            "linkedin": profile.linked_url or "",
            "github": profile.github_url or "",
            "portfolio": profile.portfolio_url or "",
        },
        "summary": profile.bio or "",
        "skills": [
            {
                "name": item.name,
                "category": item.category,
                "proficiency": item.proficiency,
                "years_experience": item.years_experience,
            }
            for item in skills
        ],
        "experience": [
            {
                "company": item.company,
                "job_title": item.job_title,
                "location": item.location or "",
                "start_date": str(item.start_date) if item.start_date else "",
                "end_date": str(item.end_date) if item.end_date else "",
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
                "start_date": str(item.start_date) if item.start_date else "",
                "end_date": str(item.end_date) if item.end_date else "",
            }
            for item in projects
        ],
        "education": [
            {
                "institution": item.institution,
                "degree": item.degree,
                "field_of_study": item.field_of_study or "",
                "location": item.location or "",
                "start_date": str(item.start_date) if item.start_date else "",
                "end_date": str(item.end_date) if item.end_date else "",
                "currently_studying": item.currently_studying,
                "grade": item.grade or "",
                "description": item.description or "",
            }
            for item in education
        ],
        "certifications": [
            {
                "name": item.name,
                "issuing_organization": item.issuing_organization,
                "issue_date": str(item.issue_date) if item.issue_date else "",
                "expiration_date": (
                    str(item.expiration_date) if item.expiration_date else ""
                ),
                "does_not_expire": item.does_not_expire,
                "credential_id": item.credential_id or "",
                "credential_url": item.credential_url or "",
            }
            for item in certifications
        ],
        "achievements": [
            achievement
            for item in experiences
            for achievement in (item.achievements or [])
        ] + [
            achievement
            for item in projects
            for achievement in (item.achievements or [])
        ],
        "languages": [],
        "links": [
            {
                "label": item.label,
                "link_type": item.link_type,
                "url": item.url,
            }
            for item in links
        ],
    }
