
from fastapi.testclient import TestClient

from main import app
from app.api.routes import parse_job as parse_job_route
from app.schemas.job import JobParseResult

client = TestClient(app)

def test_parse_job_returns_structured_result(monkeypatch):
    monkeypatch.setenv(
        "AI_SERVICE_SHARED_TOKEN",
        "test-internal-token",
    )

    # Keep the existing expected result and fake_parse function.

    response = client.post(
        "/api/v1/ai/parse-job",
        json={
            "description": (
                "Python Developer role requiring Python and SQL skills."
            )
        },
        headers={
            "X-Internal-Service-Token": "test-internal-token",
        },
    )

def test_parse_job_rejects_short_description(monkeypatch):
    monkeypatch.setenv(
        "AI_SERVICE_SHARED_TOKEN",
        "test-internal-token",
    )

    response = client.post(
        "/api/v1/ai/parse-job",
        json={"description": "too short"},
        headers={
            "X-Internal-Service-Token": "test-internal-token",
        },
    )

    assert response.status_code == 422


def test_parse_job_rejects_blank_description(monkeypatch):
    monkeypatch.setenv(
        "AI_SERVICE_SHARED_TOKEN",
        "test-internal-token",
    )

    response = client.post(
        "/api/v1/ai/parse-job",
        json={"description": "                    "},
        headers={
            "X-Internal-Service-Token": "test-internal-token",
        },
    )

    assert response.status_code == 422