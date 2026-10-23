import re


def _content_text(value):
    """Extract readable text from legacy and structured section content."""

    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    if isinstance(value, dict):
        if "text" in value:
            return _content_text(value["text"])

        return "\n".join(
            f"{key}: {_content_text(item)}"
            for key, item in value.items()
            if item not in (None, "", [], {})
        ).strip()

    if isinstance(value, list):
        return "\n".join(
            text
            for item in value
            if (text := _content_text(item))
        ).strip()

    return str(value).strip()


def _as_list(value, *, split_text=False):
    """Normalize section data without discarding structured records."""

    if value is None or value == "":
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, dict):
        return [value] if value else []

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return []

        if split_text:
            return [
                item.strip()
                for item in re.split(r"[,;\n]+", value)
                if item.strip()
            ]

        return [value]

    return [value]


def build_candidate_resume_from_version(version):
    """
    Convert a persisted ResumeVersion into AI analysis input.

    Only visible sections are included because they represent the
    selected version that the user is analyzing.
    """

    candidate = {
        "personal_info": {},
        "summary": "",
        "skills": [],
        "experience": [],
        "projects": [],
        "education": [],
        "certifications": [],
        "achievements": [],
        "languages": [],
        "links": [],
        "custom_sections": [],
    }

    sections = version.sections.filter(
        is_visible=True
    ).order_by("display_order", "created_at")

    section_mapping = {
        "EXPERIENCE": "experience",
        "PROJECTS": "projects",
        "EDUCATION": "education",
        "CERTIFICATIONS": "certifications",
        "ACHIEVEMENTS": "achievements",
        "LANGUAGES": "languages",
        "LINKS": "links",
    }

    for section in sections:
        content = section.content
        section_type = section.section_type
        title = section.title.strip().lower()

        if section_type == "SUMMARY":
            candidate["summary"] = _content_text(content)
            continue

        if section_type == "SKILLS":
            if isinstance(content, dict) and "skills" in content:
                content = content["skills"]

            candidate["skills"] = _as_list(
                content,
                split_text=isinstance(content, str),
            )
            continue

        if section_type == "CUSTOM":
            is_personal = (
                "personal" in title
                or title in {
                    "contact",
                    "contact details",
                    "personal details",
                }
            )

            if is_personal:
                if isinstance(content, dict):
                    personal = dict(content)
                else:
                    personal = {"text": _content_text(content)}

                # Normalize the field names used by older editor saves.
                aliases = {
                    "name": "full_name",
                    "address": "location",
                    "linked_url": "linkedin",
                    "github_url": "github",
                    "portfolio_url": "portfolio",
                }

                for old_key, new_key in aliases.items():
                    if (
                        old_key in personal
                        and new_key not in personal
                    ):
                        personal[new_key] = personal[old_key]

                candidate["personal_info"].update(personal)

            else:
                candidate["custom_sections"].append(
                    {
                        "title": section.title,
                        "content": content,
                    }
                )

            continue

        target_key = section_mapping.get(section_type)

        if target_key:
            candidate[target_key].extend(
                _as_list(content)
            )

    # Normalize the contact fields without losing extra profile data.
    personal = candidate["personal_info"]

    candidate["personal_info"] = {
        **personal,
        "full_name": (
            personal.get("full_name")
            or personal.get("name")
            or ""
        ),
        "email": personal.get("email", ""),
        "phone": personal.get("phone", ""),
        "location": (
            personal.get("location")
            or personal.get("address")
            or ""
        ),
        "linkedin": (
            personal.get("linkedin")
            or personal.get("linked_url")
            or ""
        ),
        "github": (
            personal.get("github")
            or personal.get("github_url")
            or ""
        ),
        "portfolio": (
            personal.get("portfolio")
            or personal.get("portfolio_url")
            or ""
        ),
    }

    return candidate

