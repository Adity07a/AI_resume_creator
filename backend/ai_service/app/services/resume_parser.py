
from io import BytesIO
import re
import zipfile
import pymupdf 
from docx import Document


SUPPORTED_EXTENSIONS={".pdf",".docx",".txt"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 10 MB
MAX_UNCOMPRESSED_DOCX_SIZE = 10 * 1024 * 1024 #10MB




def validate_resume_file(filename: str, file_bytes: bytes) -> str:
    """Validate the filename, file size, and actual file format."""

    if not filename or not filename.strip():
        raise ValueError("A filename is required.")

    # Normalize the filename and extension.
    safe_filename = filename.replace("\\", "/").rsplit("/", 1)[-1]

    extension = (
        "." + safe_filename.rsplit(".", 1)[-1].lower()
        if "." in safe_filename
        else ""
    )

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            "Unsupported file type. Please upload a PDF, DOCX, or TXT file."
        )

    if not file_bytes:
        raise ValueError("The uploaded file is empty.")

    if len(file_bytes) > MAX_UPLOAD_SIZE:
        raise ValueError("File size exceeds the 5 MB limit.")

    # Validate PDF signature.
    if extension == ".pdf":
        if b"%PDF-" not in file_bytes[:1024]:
            raise ValueError(
                "The file does not contain a valid PDF header."
            )

    # Validate DOCX ZIP structure.
    elif extension == ".docx":
        try:
            with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
                names = set(archive.namelist())

                if (
                    "[Content_Types].xml" not in names
                    or "word/document.xml" not in names
                ):
                    raise ValueError(
                        "The file is not a valid DOCX document."
                    )

                # Check the expanded size before reading archive contents.
                uncompressed_size = sum(
                    item.file_size for item in archive.infolist()
                )

                if uncompressed_size > MAX_UNCOMPRESSED_DOCX_SIZE:
                    raise ValueError(
                        "The DOCX document expands beyond the 10 MB limit."
                    )

                if archive.testzip() is not None:
                    raise ValueError(
                        "The DOCX file is damaged. Please upload it again."
                    )

        except ValueError:
            raise
        except (zipfile.BadZipFile, OSError, EOFError, RuntimeError) as exc:
            raise ValueError(
                "The DOCX file is invalid or corrupted."
            ) from exc

    # Validate plain-text files.
    elif extension == ".txt":
        if b"\x00" in file_bytes:
            raise ValueError(
                "The TXT file contains invalid binary data."
            )

        try:
            file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError(
                "The TXT file must use UTF-8 text encoding."
            ) from exc

    return extension


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    """Extract readable text from a validated PDF, DOCX, or TXT file."""

    extension = validate_resume_file(filename, file_bytes)

    try:
        if extension == ".pdf":
            with pymupdf.open(
                stream=file_bytes,
                filetype="pdf",
            ) as document:
                if document.is_encrypted:
                    raise ValueError(
                        "Password-protected PDFs are not supported."
                    )

                text_parts = [
                    page.get_text() for page in document
                ]
                extracted_text = "\n".join(text_parts)

        elif extension == ".docx":
            document = Document(BytesIO(file_bytes))

            paragraphs = [
                paragraph.text for paragraph in document.paragraphs
            ]

            table_text = [
                " | ".join(cell.text for cell in row.cells)
                for table in document.tables
                for row in table.rows
            ]

            extracted_text = "\n".join(paragraphs + table_text)

        else:
            extracted_text = file_bytes.decode("utf-8-sig")

    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(
            "Could not read this file. Please upload a valid, readable document."
        ) from exc

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise ValueError(
            "No readable text was found. Scanned PDFs may require OCR support."
        )

    # Prevent excessively long extracted text from reaching the LLM.
    if len(extracted_text) > 50_000:
        extracted_text = extracted_text[:50_000]

    return extracted_text


def extract_contact_details(text: str) -> dict[str, str]:
    """
    Extract contact details directly from resume text.
    These values do not depend on the LLM.
    """
    result = {
        "full_name": "",
        "email": "",
        "phone": "",
        "location": "",
        "linkedin": "",
        "github": "",
        "portfolio": "",
    }

    # Extract email address.
    email_match = re.search(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        text,
        re.IGNORECASE,
    )
    if email_match:
        result["email"] = email_match.group(0)

    # Extract a phone number, including international prefixes.
    phone_match = re.search(
        r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)",
        text,
    )
    if phone_match:
        result["phone"] = phone_match.group(0).strip()

    # Find URLs and common profile links.
    urls = re.findall(
        r"(?:https?://|www\.)[^\s<>\"']+"
        r"|(?<![@\w])(?:linkedin\.com|github\.com)/[^\s<>\"']+",
        text,
        re.IGNORECASE,
    )

    for url in urls:
        url = url.rstrip(".,;:)]}")
        normalized = url.lower()

        if "linkedin.com/" in normalized:
            if not result["linkedin"]:
                result["linkedin"] = url

        elif "github.com/" in normalized:
            if not result["github"]:
                result["github"] = url

        elif not result["portfolio"]:
            result["portfolio"] = url

    return result

def extract_document_links(filename: str, file_bytes: bytes) -> list[str]:
    """Extract actual hyperlink destinations from PDF and DOCX files."""

    extension = (
        "." + filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    links = []

    try:
        if extension == ".pdf":
            with pymupdf.open(
                stream=file_bytes,
                filetype="pdf",
            ) as document:
                for page in document:
                    for link in page.get_links():
                        url = link.get("uri")

                        if url:
                            links.append(url.strip())

        elif extension == ".docx":
            document = Document(BytesIO(file_bytes))

            for relationship in document.part.rels.values():
                if (
                    relationship.reltype.endswith("/hyperlink")
                    and relationship.target_mode == "External"
                ):
                    links.append(relationship.target.strip())

    except Exception as exc:
        raise ValueError(
            "Could not extract hyperlink destinations from this file."
        ) from exc

    # Remove duplicates while preserving the original order.
    return list(dict.fromkeys(links))





def extract_skills(text: str) -> list[str]:
    """Extract skills from the resume's Skills section, with a safe fallback."""

    known_skills = [
        "Python",
        "Java",
        "SQL",
        "PySpark",
        "Apache Spark",
        "Apache Kafka",
        "Apache Airflow",
        "Pandas",
        "NumPy",
        "Scikit-Learn",
        "Machine Learning",
        "Deep Learning",
        "Generative AI",
        "GenAI",
        "LLMs",
        "NLP",
        "LangChain",
        "OpenAI API",
        "FastAPI",
        "Django",
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Power BI",
        "Tableau",
        "Excel",
        "Big Data",
        "Data Warehousing",
        "ETL",
        "Git",
        "Docker",
        "AWS",
        "Azure",
    ]

    # Find the Skills section, if present.
    section_match = re.search(
        r"(?im)^[ \t]*(?:technical\s+)?skills"
        r"(?:\s*(?:and|&)\s*(?:tools|technologies|expertise))?"
        r"[ \t]*:?[ \t]*$",
        text,
    )

    if section_match:
        section_text = text[section_match.end():]

        # Stop at the next likely resume section heading.
        next_heading = re.search(
            r"(?im)^[ \t]*(?:"
            r"experience|work experience|professional experience|"
            r"education|projects|certifications|achievements|"
            r"summary|professional summary|internship|"
            r"languages|personal details"
            r")[ \t]*:?[ \t]*$",
            section_text,
        )

        if next_heading:
            section_text = section_text[:next_heading.start()]

        # Match only known skills actually present in this section.
        found = [
            skill for skill in known_skills
            if re.search(
                r"(?<![A-Za-z0-9])"
                + re.escape(skill)
                + r"(?![A-Za-z0-9])",
                section_text,
                re.IGNORECASE,
            )
        ]

        if found:
            return found

    # Fallback: return known skills mentioned anywhere in the resume.
    # This does not invent skills absent from the document.
    return [
        skill for skill in known_skills
        if re.search(
            r"(?<![A-Za-z0-9])"
            + re.escape(skill)
            + r"(?![A-Za-z0-9])",
            text,
            re.IGNORECASE,
        )
    ]


def extract_job_title(text: str) -> str:
    """Recover a job title from explicit wording in the resume."""

    patterns = [
        r"\bworked\s+as\s+(?:a|an)\s+([^,.;\n]+)",
        r"\b(?:job\s+title|position|role)\s*:\s*([^,.;\n]+)",
        r"\b(?:job\s+title|position|role)\s+was\s+"
        r"(?:a|an)?\s*([^,.;\n]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            title = match.group(1).strip(" \t:-")
            if title:
                return title

    return ""



def separate_education_and_certifications(education, certifications):
    """Move obvious course/certificate entries out of education."""

    kept_education = []
    extracted_certifications = list(certifications)

    course_keywords = (
        "course",
        "certification",
        "certificate",
        "training",
        "bootcamp",
        "completion",
    )

    learning_platforms = (
        "udemy",
        "coursera",
        "kaggle",
        "linkedin learning",
        "edx",
        "simplilearn",
        "great learning",
        "skillshare",
    )

    formal_degree_keywords = (
        "bachelor",
        "b.tech",
        "b.e.",
        "master",
        "m.tech",
        "m.e.",
        "ph.d",
        "high school",
        "secondary school",
        "diploma",
    )

    for item in education:
        degree = item.degree.strip()
        institution = item.institution.strip()

        degree_lower = degree.lower()
        institution_lower = institution.lower()

        is_formal_degree = any(
            keyword in degree_lower
            for keyword in formal_degree_keywords
        )

        is_course_or_certificate = (
            any(keyword in degree_lower for keyword in course_keywords)
            or any(
                platform in institution_lower
                for platform in learning_platforms
            )
        ) and not is_formal_degree

        if is_course_or_certificate:
            # Preserve the course/certificate title.
            if degree:
                extracted_certifications.append(degree)

            # Some resumes put a second course under institution.
            if institution and (
                any(
                    keyword in institution_lower
                    for keyword in course_keywords
                )
                or any(
                    platform in institution_lower
                    for platform in learning_platforms
                )
            ):
                extracted_certifications.append(institution)
        else:
            kept_education.append(item)

    # Remove duplicates while preserving order.
    unique_certifications = []
    seen = set()

    for certification in extracted_certifications:
        certification = certification.strip()
        key = certification.casefold()

        if certification and key not in seen:
            seen.add(key)
            unique_certifications.append(certification)

    return kept_education, unique_certifications


