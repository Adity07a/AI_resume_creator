from typing import Any
from pydantic import BaseModel,ConfigDict, Field, field_validator

class PersonalInfo(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    headline: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


class ExperienceItem(BaseModel):
    job_title: str = ""
    company: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    currently_working: bool = False

    description: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    domain_tags: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str = ""
    role: str = ""
    description: str = ""
    technologies: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    project_url: str = ""
    start_date: str = ""
    end_date: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    field_of_study: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    currently_studying: bool = False
    grade: str = ""
    description: str = ""


class ResumeParseResult(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)

    @field_validator("certifications", mode="before")
    @classmethod
    def normalize_certifications(cls, value):
        if value is None:
            return []

        if not isinstance(value, list):
            raise ValueError("Certifications must be a list.")

        normalized = []

        for item in value:
            if isinstance(item, str):
                text = item.strip()

            elif isinstance(item, dict):
                name = str(
                    item.get("name") or item.get("title") or ""
                ).strip()
                issuer = str(
                    item.get("issuer") or item.get("organization") or ""
                ).strip()
                date = str(
                    item.get("date") or item.get("issue_date") or ""
                ).strip()

                text = " — ".join(
                    part for part in (name, issuer, date) if part
                )

                url = str(
                    item.get("credential_url") or item.get("url") or ""
                ).strip()

                if url:
                    text = f"{text} | {url}" if text else url

            else:
                raise ValueError(
                    "Each certification must be a string or object."
                )

            if text:
                normalized.append(text)

        return list(dict.fromkeys(normalized))

    
    @field_validator("links", mode="before")
    @classmethod
    def normalize_links(cls, value):
        """Accept both string links and frontend link objects."""

        if value is None:
            return []

        if isinstance(value, str):
            value = [value]

        if not isinstance(value, list):
            raise ValueError("Links must be a list.")

        normalized = []

        for item in value:
            if isinstance(item, str):
                link = item.strip()

            elif isinstance(item, dict):
                name = str(
                    item.get("name")
                    or item.get("type")
                    or item.get("label")
                    or ""
                ).strip()

                url = str(
                    item.get("url")
                    or item.get("href")
                    or item.get("uri")
                    or ""
                ).strip()

                # Keep the actual URL when available.
                # Personal information separately stores GitHub
                # and LinkedIn URLs.
                link = url or name

            else:
                raise ValueError(
                    "Each link must be a string or an object."
                )

            if link:
                normalized.append(link)

        # Remove duplicates while preserving order.
        return list(dict.fromkeys(normalized))



class CandidateResumeInput(BaseModel):
    """
    Flexible, validated input for resume generation.

    Supports existing parsed-resume data as well as richer canonical
    profile records. Extra top-level profile data is retained rather
    than silently discarded.
    """

    model_config = ConfigDict(extra="allow")

    personal_info: dict[str, Any] = Field(default_factory=dict)
    summary: str = ""

    skills: list[Any] = Field(default_factory=list)
    experience: list[Any] = Field(default_factory=list)
    projects: list[Any] = Field(default_factory=list)
    education: list[Any] = Field(default_factory=list)
    certifications: list[Any] = Field(default_factory=list)
    achievements: list[Any] = Field(default_factory=list)
    languages: list[Any] = Field(default_factory=list)
    links: list[Any] = Field(default_factory=list)

    target_role_preferences: list[Any] = Field(default_factory=list)


