
from pydantic import BaseModel, Field # type: ignore


class PersonalInfo(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


class ExperienceItem(BaseModel):
    job_title: str = ""
    company: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    responsibilities: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    technologies: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    grade: str = ""


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
