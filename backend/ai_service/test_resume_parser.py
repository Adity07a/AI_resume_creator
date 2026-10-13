
from app.services.resume_parser import extract_resume_text


sample_resume = """
Aditya Singh
Python Developer

Skills: Python, Django, FastAPI, SQL

Experience:
Data Engineer Intern
Worked with Python, SQL, and data pipelines.

Education:
Bachelor's degree in Computer Science.
"""

result = extract_resume_text(
    filename="sample_resume.txt",
    file_bytes=sample_resume.encode("utf-8"),
)

print("Resume text extracted successfully:")
print(result)
