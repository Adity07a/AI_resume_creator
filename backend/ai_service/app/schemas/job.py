
from pydantic import BaseModel, Field, field_validator


class JobParseRequest(BaseModel):
    description: str = Field(
        min_length=20,
        max_length=50000,
        description="Full text of the job description.",
    )

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 20:
            raise ValueError(
                "Job description must contain at least 20 "
                "non-whitespace characters."
            )

        return value


class JobParseResult(BaseModel):
    job_title: str = Field(
        default="",
        description="Job title stated in the description, or empty if unknown.",
    )
    company_name: str = Field(
        default="",
        description="Company name stated in the description, or empty if unknown.",
    )
    experience_level: str = Field(
        default="Unknown",
        description="Explicitly stated experience level, or Unknown.",
    )
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    qualifications: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    summary: str = Field(
        default="",
        description="Brief summary based only on the supplied description.",
    )

    @field_validator("qualifications", mode="before")
    @classmethod
    def normalize_qualifications(cls, value):
        if value is None:
            return []

        if isinstance(value, str):
            value = value.strip()

            if not value:
                return []

            # Convert multiline or semicolon-separated text into a list.
            if "\n" in value or ";" in value:
                items = value.replace("\r", "").split("\n")
                normalized = []

                for item in items:
                    normalized.extend(
                        part.strip().lstrip("-•* ").strip()
                        for part in item.split(";")
                        if part.strip().lstrip("-•* ").strip()
                    )

                return normalized

            # A single qualification is valid as a one-item list.
            return [value]

        if isinstance(value, list):
            return value

        raise ValueError("qualifications must be a string or a list")
