
import io
import zipfile

import pytest

from app.services.resume_parser import validate_resume_file


def test_rejects_unsupported_extension():
    with pytest.raises(ValueError, match="Unsupported file type"):
        validate_resume_file("resume.exe", b"some content")


def test_rejects_empty_file():
    with pytest.raises(ValueError, match="empty"):
        validate_resume_file("resume.txt", b"")


def test_rejects_file_with_wrong_pdf_content():
    with pytest.raises(ValueError, match="PDF header"):
        validate_resume_file("resume.pdf", b"This is not a PDF")


def test_rejects_binary_content_disguised_as_txt():
    with pytest.raises(ValueError, match="binary data"):
        validate_resume_file("resume.txt", b"resume\x00binary")


def test_rejects_invalid_docx():
    with pytest.raises(ValueError, match="DOCX"):
        validate_resume_file("resume.docx", b"not a DOCX file")


def test_rejects_oversized_file():
    oversized_content = b"a" * (5 * 1024 * 1024 + 1)

    with pytest.raises(ValueError, match="5 MB"):
        validate_resume_file("resume.txt", oversized_content)


def test_rejects_zip_that_is_not_a_docx():
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("some_file.txt", "This is not a DOCX.")

    with pytest.raises(ValueError, match="DOCX"):
        validate_resume_file("resume.docx", buffer.getvalue())
