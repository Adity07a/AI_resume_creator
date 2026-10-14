
from fastapi.testclient import TestClient

from main import app
from app.api.routes import parse_job as parse_job_route
from app.schemas.job import JobParseResult

client = TestClient(app)


def test_parse_job_returns_structured_result(monkeypatch):
    expected = JobParseResult(
        job_title="Python Developer",
        company_name="Example Ltd",
        experience_level="Entry-level",
        required_skills=["Python", "SQL"],
        preferred_skills=["Docker"],
        qualifications=["Bachelor's degree or equivalent"],
        responsibilities=["Build backend APIs"],
        keywords=["Python", "SQL", "REST API"],
        summary="Entry-level Python role focused on backend APIs.",
    )

    async def fake_parse(_request):
        return expected

    monkeypatch.setattr(
        parse_job_route,
        "parse_job_description",
        fake_parse,
    )

    response = client.post(
        "/api/v1/ai/parse-job",
        json={
            "description": (
                "Python Developer role requiring Python and SQL skills."
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["job_title"] == "Python Developer"
    assert response.json()["required_skills"] == ["Python", "SQL"]


def test_parse_job_rejects_short_description():
    response = client.post(
        "/api/v1/ai/parse-job",
        json={"description": "too short"},
    )

    assert response.status_code == 422


def test_parse_job_rejects_blank_description():
    response = client.post(
        "/api/v1/ai/parse-job",
        json={"description": "                    "},
    )

    assert response.status_code == 422
